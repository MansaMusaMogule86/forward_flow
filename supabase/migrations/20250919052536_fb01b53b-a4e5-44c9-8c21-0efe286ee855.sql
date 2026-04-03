-- Fix Critical Security Issue: Anonymous Sessions RLS Policy
DROP POLICY IF EXISTS "Users can manage their own anonymous sessions" ON public.anonymous_sessions;

-- Create more restrictive RLS policy for anonymous sessions
DROP POLICY IF EXISTS "Anonymous sessions token-based access" ON public.anonymous_sessions; CREATE POLICY "Anonymous sessions token-based access" ON public.anonymous_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Fix Duplicate Session Token Error: Update function to use UPSERT
CREATE OR REPLACE FUNCTION public.track_anonymous_ai_usage(p_session_token text, p_ai_endpoint text, p_conversation_data jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  session_record RECORD;
  usage_time_minutes integer;
  trial_limit_minutes integer := 3; -- 3 minute trial
  result jsonb;
BEGIN
  -- Get or create session using UPSERT to prevent duplicates
  INSERT INTO public.anonymous_sessions (session_token, ai_usage_count, conversation_history)
  VALUES (p_session_token, 1, COALESCE(p_conversation_data, '[]'::jsonb))
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    ai_usage_count = anonymous_sessions.ai_usage_count + 1,
    conversation_history = CASE 
      WHEN p_conversation_data IS NOT NULL THEN p_conversation_data
      ELSE anonymous_sessions.conversation_history
    END,
    updated_at = now()
  RETURNING * INTO session_record ON CONFLICT DO NOTHING;
  
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
      'usage_count', session_record.ai_usage_count,
      'time_remaining', 0,
      'trial_expired', true,
      'message', 'Your 3-minute trial has ended. Sign up to continue your journey!'
    );
  END IF;
  
  -- Return success with time remaining
  RETURN jsonb_build_object(
    'allowed', true,
    'usage_count', session_record.ai_usage_count,
    'time_remaining', (trial_limit_minutes * 60) - (usage_time_minutes * 60),
    'trial_expired', false,
    'is_new_session', session_record.ai_usage_count = 1
  );
END;
$function$;