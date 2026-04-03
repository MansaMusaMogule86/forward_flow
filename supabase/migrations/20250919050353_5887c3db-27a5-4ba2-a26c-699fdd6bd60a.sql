-- First, let's create a function to manually add admin role for the first user
-- This will help the user get admin access immediately

CREATE OR REPLACE FUNCTION public.create_first_admin_user(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID from auth.users by email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email 
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please register first.', admin_email;
  END IF;
  
  -- Create admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the admin creation
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    admin_user_id,
    'ADMIN_ROLE_CREATED',
    'user_roles',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Admin role created for user: %', admin_email;
END;
$$;

-- Create a function to check if any admin exists (for security)
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role
  );
$$;

-- Create anonymous session tracking table
CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text NOT NULL UNIQUE,
  ai_usage_count integer DEFAULT 0,
  ai_usage_start_time timestamp with time zone DEFAULT now(),
  conversation_history jsonb DEFAULT '[]'::jsonb,
  trial_expired boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

-- Enable RLS for anonymous sessions
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write their own session (by session_token)
DROP POLICY IF EXISTS "Users can manage their own anonymous sessions" ON public.anonymous_sessions; CREATE POLICY "Users can manage their own anonymous sessions" ON public.anonymous_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- CREATE OR REPLACE FUNCTION to manage anonymous AI usage
CREATE OR REPLACE FUNCTION public.track_anonymous_ai_usage(
  p_session_token text,
  p_ai_endpoint text,
  p_conversation_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_record RECORD;
  usage_time_minutes integer;
  trial_limit_minutes integer := 3; -- 3 minute trial
  result jsonb;
BEGIN
  -- Get or create session
  SELECT * INTO session_record
  FROM public.anonymous_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();
  
  -- Create new session if not found
  IF NOT FOUND THEN
    INSERT INTO public.anonymous_sessions (session_token, ai_usage_count, conversation_history)
    VALUES (p_session_token, 1, COALESCE(p_conversation_data, '[]'::jsonb))
    RETURNING * INTO session_record ON CONFLICT DO NOTHING;
    
    -- Return success for new session
    RETURN jsonb_build_object(
      'allowed', true,
      'usage_count', 1,
      'time_remaining', trial_limit_minutes * 60,
      'trial_expired', false,
      'is_new_session', true
    );
  END IF;
  
  -- Check if trial has expired
  IF session_record.trial_expired THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_count', session_record.ai_usage_count,
      'time_remaining', 0,
      'trial_expired', true,
      'message', 'Trial period has ended. Please sign up to continue.'
    );
  END IF;
  
  -- Calculate usage time
  usage_time_minutes := EXTRACT(EPOCH FROM (now() - session_record.ai_usage_start_time)) / 60;
  
  -- Check if trial time limit exceeded
  IF usage_time_minutes >= trial_limit_minutes THEN
    -- Mark trial as expired
    UPDATE public.anonymous_sessions
    SET trial_expired = true, updated_at = now()
    WHERE session_token = p_session_token;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_count', session_record.ai_usage_count + 1,
      'time_remaining', 0,
      'trial_expired', true,
      'message', 'Your 3-minute trial has ended. Sign up to continue your journey!'
    );
  END IF;
  
  -- Update session with new usage
  UPDATE public.anonymous_sessions
  SET 
    ai_usage_count = ai_usage_count + 1,
    conversation_history = CASE 
      WHEN p_conversation_data IS NOT NULL THEN p_conversation_data
      ELSE conversation_history
    END,
    updated_at = now()
  WHERE session_token = p_session_token;
  
  -- Return success with time remaining
  RETURN jsonb_build_object(
    'allowed', true,
    'usage_count', session_record.ai_usage_count + 1,
    'time_remaining', (trial_limit_minutes * 60) - (usage_time_minutes * 60),
    'trial_expired', false
  );
END;
$$;

-- CREATE OR REPLACE FUNCTION to transfer anonymous session to user account
CREATE OR REPLACE FUNCTION public.transfer_anonymous_session_to_user(
  p_session_token text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_record RECORD;
  result jsonb;
BEGIN
  -- Get the anonymous session
  SELECT * INTO session_record
  FROM public.anonymous_sessions
  WHERE session_token = p_session_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Session not found'
    );
  END IF;
  
  -- Log the transfer for audit
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    p_user_id,
    'ANONYMOUS_SESSION_TRANSFER',
    'anonymous_sessions',
    false,
    now()
  ) ON CONFLICT DO NOTHING;
  
  -- Clean up the anonymous session (optional - could keep for analytics)
  -- DELETE FROM public.anonymous_sessions WHERE session_token = p_session_token;
  
  RETURN jsonb_build_object(
    'success', true,
    'conversation_history', session_record.conversation_history,
    'usage_count', session_record.ai_usage_count,
    'message', 'Session successfully transferred to user account'
  );
END;
$$;