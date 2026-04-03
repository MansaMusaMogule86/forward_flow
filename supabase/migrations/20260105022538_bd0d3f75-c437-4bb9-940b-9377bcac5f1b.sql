-- API Key Rotation Tracking Table
CREATE TABLE IF NOT EXISTS public.api_key_rotation_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  key_description TEXT,
  last_rotated_at TIMESTAMP WITH TIME ZONE,
  rotation_interval_days INTEGER NOT NULL DEFAULT 90,
  rotated_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_key_rotation_tracking ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage API key rotation tracking
DROP POLICY IF EXISTS "Admins can view api key rotation tracking" ON public.api_key_rotation_tracking; CREATE POLICY "Admins can view api key rotation tracking" ON public.api_key_rotation_tracking
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert api key rotation tracking" ON public.api_key_rotation_tracking; CREATE POLICY "Admins can insert api key rotation tracking" ON public.api_key_rotation_tracking
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update api key rotation tracking" ON public.api_key_rotation_tracking; CREATE POLICY "Admins can update api key rotation tracking" ON public.api_key_rotation_tracking
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_api_key_rotation_tracking_updated_at ON public.api_key_rotation_tracking; CREATE TRIGGER update_api_key_rotation_tracking_updated_at BEFORE UPDATE ON public.api_key_rotation_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial API keys that are configured in secrets
INSERT INTO public.api_key_rotation_tracking (key_name, key_description, rotation_interval_days, is_critical) VALUES
  ('OPENAI_API_KEY', 'OpenAI API key for AI chat features', 90, true),
  ('RESEND_API_KEY', 'Resend API key for email delivery', 90, true),
  ('STRIPE_SECRET_KEY', 'Stripe secret key for payment processing', 90, true),
  ('PERPLEXITY_API_KEY', 'Perplexity API key for AI search', 90, false),
  ('SPARKLOOP_API_KEY', 'SparkLoop API key for newsletter growth', 180, false),
  ('BEEHIVE_API_KEY', 'Beehive API key for newsletter integration', 180, false),
  ('CRON_SECRET_TOKEN', 'Secret token for cron job authentication', 180, false) ON CONFLICT DO NOTHING;

-- AI Rate Limiting Table for tracking requests
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_ai_rate_limits_lookup ON public.ai_rate_limits(identifier, endpoint, created_at);

-- Enable RLS
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits (edge functions use service role)
DROP POLICY IF EXISTS "Service role manages ai rate limits" ON public.ai_rate_limits; CREATE POLICY "Service role manages ai rate limits" ON public.ai_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to check AI rate limit
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(
  is_rate_limited BOOLEAN,
  current_count INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO v_request_count
  FROM public.ai_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at > v_window_start;
  
  RETURN QUERY SELECT
    (v_request_count >= p_max_requests)::BOOLEAN,
    v_request_count::INTEGER,
    (v_window_start + (p_window_minutes || ' minutes')::INTERVAL)::TIMESTAMPTZ;
END;
$$;

-- Function to record AI request
CREATE OR REPLACE FUNCTION public.record_ai_request(
  p_identifier TEXT,
  p_endpoint TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ai_rate_limits (identifier, endpoint)
  VALUES (p_identifier, p_endpoint)
  RETURNING id INTO v_id ON CONFLICT DO NOTHING;
  
  RETURN v_id;
END;
$$;

-- Cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.ai_rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Add mfa columns to user_roles for MFA tracking
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP WITH TIME ZONE;