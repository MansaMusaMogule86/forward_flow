-- Create login_attempts table for rate limiting and security tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  attempt_type TEXT NOT NULL DEFAULT 'login', -- 'login', 'signup', 'password_reset'
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_ip_created ON public.login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_email_created ON public.login_attempts(email, created_at DESC);

-- Create account_lockouts table
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_at TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_lockouts_email ON public.account_lockouts(email);

-- Create admin_ip_whitelist table for admin access control
CREATE TABLE IF NOT EXISTS public.admin_ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_admin_ip_whitelist_ip ON public.admin_ip_whitelist(ip_address) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ip_whitelist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_attempts (service role only for writes, admins can read)
DROP POLICY IF EXISTS "Service role can insert login attempts" ON public.login_attempts; CREATE POLICY "Service role can insert login attempts" ON public.login_attempts FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts; CREATE POLICY "Admins can view login attempts" ON public.login_attempts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for account_lockouts
DROP POLICY IF EXISTS "Service role can manage lockouts" ON public.account_lockouts; CREATE POLICY "Service role can manage lockouts" ON public.account_lockouts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view lockouts" ON public.account_lockouts; CREATE POLICY "Admins can view lockouts" ON public.account_lockouts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete lockouts" ON public.account_lockouts; CREATE POLICY "Admins can delete lockouts" ON public.account_lockouts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for admin_ip_whitelist
DROP POLICY IF EXISTS "Admins can manage IP whitelist" ON public.admin_ip_whitelist; CREATE POLICY "Admins can manage IP whitelist" ON public.admin_ip_whitelist FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to check rate limit (5 attempts per 15 minutes per IP)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  p_ip_address TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_rate_limited BOOLEAN,
  attempts_remaining INTEGER,
  reset_at TIMESTAMPTZ,
  requires_captcha BOOLEAN,
  is_locked_out BOOLEAN,
  lockout_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_attempts INTEGER;
  v_email_attempts INTEGER;
  v_max_attempts INTEGER := 5;
  v_captcha_threshold INTEGER := 3;
  v_window_minutes INTEGER := 15;
  v_lockout_record RECORD;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Check for account lockout first
  IF p_email IS NOT NULL THEN
    SELECT * INTO v_lockout_record
    FROM public.account_lockouts
    WHERE email = LOWER(p_email)
      AND unlock_at > NOW();
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        true::BOOLEAN,
        0::INTEGER,
        v_lockout_record.unlock_at,
        true::BOOLEAN,
        true::BOOLEAN,
        v_lockout_record.unlock_at;
      RETURN;
    END IF;
  END IF;

  -- Count failed attempts by IP in the window
  SELECT COUNT(*) INTO v_ip_attempts
  FROM public.login_attempts
  WHERE ip_address = p_ip_address
    AND success = false
    AND created_at > NOW() - (v_window_minutes || ' minutes')::INTERVAL;

  -- Count failed attempts by email if provided
  IF p_email IS NOT NULL THEN
    SELECT COUNT(*) INTO v_email_attempts
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
      AND success = false
      AND created_at > NOW() - (v_window_minutes || ' minutes')::INTERVAL;
  ELSE
    v_email_attempts := 0;
  END IF;

  -- Calculate reset time
  SELECT created_at + (v_window_minutes || ' minutes')::INTERVAL INTO v_reset_time
  FROM public.login_attempts
  WHERE (ip_address = p_ip_address OR (p_email IS NOT NULL AND email = LOWER(p_email)))
    AND success = false
    AND created_at > NOW() - (v_window_minutes || ' minutes')::INTERVAL
  ORDER BY created_at ASC
  LIMIT 1;

  -- Return rate limit status
  RETURN QUERY SELECT
    (GREATEST(v_ip_attempts, v_email_attempts) >= v_max_attempts)::BOOLEAN,
    GREATEST(0, v_max_attempts - GREATEST(v_ip_attempts, v_email_attempts))::INTEGER,
    COALESCE(v_reset_time, NOW() + (v_window_minutes || ' minutes')::INTERVAL),
    (GREATEST(v_ip_attempts, v_email_attempts) >= v_captcha_threshold)::BOOLEAN,
    false::BOOLEAN,
    NULL::TIMESTAMPTZ;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL,
  p_attempt_type TEXT DEFAULT 'login'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id UUID;
  v_failed_attempts INTEGER;
  v_lockout_threshold INTEGER := 10;
  v_lockout_duration INTERVAL := '30 minutes';
BEGIN
  -- Insert the attempt
  INSERT INTO public.login_attempts (
    email,
    ip_address,
    user_agent,
    attempt_type,
    success,
    failure_reason
  ) VALUES (
    LOWER(p_email),
    p_ip_address,
    p_user_agent,
    p_attempt_type,
    p_success,
    p_failure_reason
  ) RETURNING id INTO v_attempt_id ON CONFLICT DO NOTHING;

  -- If failed, check if we need to lock the account
  IF NOT p_success AND p_email IS NOT NULL THEN
    -- Count recent failed attempts for this email
    SELECT COUNT(*) INTO v_failed_attempts
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
      AND success = false
      AND created_at > NOW() - INTERVAL '1 hour';

    -- Lock account if threshold exceeded
    IF v_failed_attempts >= v_lockout_threshold THEN
      INSERT INTO public.account_lockouts (
        email,
        failed_attempts,
        unlock_at,
        lockout_reason
      ) VALUES (
        LOWER(p_email),
        v_failed_attempts,
        NOW() + v_lockout_duration,
        'Too many failed login attempts'
      )
      ON CONFLICT (email) DO UPDATE SET
        failed_attempts = EXCLUDED.failed_attempts,
        unlock_at = NOW() + v_lockout_duration,
        locked_at = NOW(),
        updated_at = NOW() ON CONFLICT DO NOTHING;

      -- Log security alert
      INSERT INTO public.security_alerts (
        alert_type,
        severity,
        description,
        alert_data
      ) VALUES (
        'account_lockout',
        'high',
        'Account locked due to excessive failed login attempts',
        jsonb_build_object(
          'email', LOWER(p_email),
          'failed_attempts', v_failed_attempts,
          'ip_address', p_ip_address,
          'locked_until', NOW() + v_lockout_duration
        )
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- If successful, clear any lockouts
  IF p_success AND p_email IS NOT NULL THEN
    DELETE FROM public.account_lockouts WHERE email = LOWER(p_email);
  END IF;

  RETURN v_attempt_id;
END;
$$;

-- Function to check admin IP whitelist
CREATE OR REPLACE FUNCTION public.check_admin_ip_whitelist(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_whitelist_exists BOOLEAN;
  v_ip_allowed BOOLEAN;
BEGIN
  -- Check if whitelist has any entries
  SELECT EXISTS(SELECT 1 FROM public.admin_ip_whitelist WHERE is_active = true)
  INTO v_whitelist_exists;

  -- If no whitelist entries, allow all (whitelist not configured)
  IF NOT v_whitelist_exists THEN
    RETURN true;
  END IF;

  -- Check if IP is in whitelist
  SELECT EXISTS(
    SELECT 1 FROM public.admin_ip_whitelist
    WHERE ip_address = p_ip_address AND is_active = true
  ) INTO v_ip_allowed;

  RETURN v_ip_allowed;
END;
$$;

-- Clean up old login attempts (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;