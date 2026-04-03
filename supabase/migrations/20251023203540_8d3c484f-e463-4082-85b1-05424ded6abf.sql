-- CREATE OR REPLACE FUNCTION to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_advanced_suspicious_activity()
RETURNS TABLE(
  alert_type text,
  severity text,
  description text,
  user_id uuid,
  alert_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Detect multiple failed admin p_actions
  RETURN QUERY
  SELECT 
    'multiple_failed_p_actions'::text,
    'high'::text,
    'Multiple failed p_actions detected from user'::text,
    al.user_id,
    jsonb_build_object(
      'failed_count', COUNT(*),
      'last_attempt', MAX(al.created_at),
      'ip_addresses', jsonb_agg(DISTINCT al.ip_address)
    )
  FROM public.audit_logs al
  WHERE al.severity = 'error'
    AND al.created_at > NOW() - INTERVAL '1 hour'
    AND al.user_id IS NOT NULL
  GROUP BY al.user_id
  HAVING COUNT(*) > 5;

  -- Detect unusual access patterns
  RETURN QUERY
  SELECT 
    'unusual_access_pattern'::text,
    'medium'::text,
    'Unusual access pattern detected'::text,
    al.user_id,
    jsonb_build_object(
      'access_count', COUNT(*),
      'unique_ips', COUNT(DISTINCT al.ip_address),
      'timeframe', '15 minutes'
    )
  FROM public.audit_logs al
  WHERE al.created_at > NOW() - INTERVAL '15 minutes'
    AND al.user_id IS NOT NULL
  GROUP BY al.user_id
  HAVING COUNT(*) > 50 OR COUNT(DISTINCT al.ip_address) > 3;

  -- Detect expired contact access still in use
  RETURN QUERY
  SELECT 
    'expired_access_usage'::text,
    'critical'::text,
    'Contact access used after expiration'::text,
    caj.admin_user_id,
    jsonb_build_object(
      'organization_id', caj.organization_id,
      'expired_at', caj.expires_at,
      'justification_id', caj.id
    )
  FROM public.contact_access_justifications caj
  WHERE caj.status = 'approved'
    AND caj.expires_at < NOW()
    AND EXISTS (
      SELECT 1 FROM public.audit_logs al
      WHERE al.user_id = caj.admin_user_id
        AND al.created_at > caj.expires_at
        AND al.details->>'organization_id' = caj.organization_id::text
    );
END;
$$;

-- CREATE OR REPLACE FUNCTION to resolve security alerts
CREATE OR REPLACE FUNCTION public.resolve_security_alert(p_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can resolve security alerts';
  END IF;

  -- Update the alert
  UPDATE public.security_alerts
  SET 
    resolved = true,
    resolved_at = NOW(),
    acknowledged = true,
    acknowledged_at = COALESCE(acknowledged_at, NOW()),
    acknowledged_by = auth.uid()
  WHERE id = p_alert_id
    AND NOT resolved;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details, severity)
  VALUES (
    auth.uid(),
    'SECURITY_ALERT_RESOLVED',
    'security_alert',
    p_alert_id,
    jsonb_build_object('resolved_at', NOW()),
    'info'
  ) ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

-- CREATE OR REPLACE FUNCTION to track anonymous AI usage
CREATE OR REPLACE FUNCTION public.track_anonymous_ai_usage(
  p_session_id text,
  p_ai_endpoint text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_record RECORD;
  new_session_id uuid;
BEGIN
  -- Try to find existing session
  SELECT * INTO session_record
  FROM public.ai_trial_sessions
  WHERE session_id = p_session_id
    AND ai_endpoint = p_ai_endpoint
  FOR UPDATE;

  IF FOUND THEN
    -- Check if trial has expired
    IF session_record.trial_end < NOW() THEN
      UPDATE public.ai_trial_sessions
      SET is_expired = true
      WHERE id = session_record.id;
      
      RAISE EXCEPTION 'Trial period has expired';
    END IF;

    -- Increment usage count
    UPDATE public.ai_trial_sessions
    SET 
      usage_count = usage_count + 1,
      updated_at = NOW()
    WHERE id = session_record.id;
    
    RETURN session_record.id;
  ELSE
    -- Create new trial session (5 minutes trial, 10 uses max)
    INSERT INTO public.ai_trial_sessions (
      session_id,
      ai_endpoint,
      trial_start,
      trial_end,
      usage_count,
      is_expired
    ) VALUES (
      p_session_id,
      p_ai_endpoint,
      NOW(),
      NOW() + INTERVAL '5 minutes',
      1,
      false
    )
    RETURNING id INTO new_session_id ON CONFLICT DO NOTHING;
    
    RETURN new_session_id;
  END IF;
END;
$$;

-- CREATE OR REPLACE FUNCTION to transfer anonymous session to authenticated user
CREATE OR REPLACE FUNCTION public.transfer_anonymous_session_to_user(
  p_session_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update all trial sessions for this session_id to the user
  UPDATE public.ai_trial_sessions
  SET 
    user_id = p_user_id,
    updated_at = NOW()
  WHERE session_id = p_session_id
    AND user_id IS NULL;

  -- Update chat history
  UPDATE public.chat_history
  SET user_id = p_user_id
  WHERE session_id = p_session_id
    AND user_id IS NULL;

  -- Log the transfer
  INSERT INTO public.audit_logs (user_id, action, details, severity)
  VALUES (
    p_user_id,
    'ANONYMOUS_SESSION_TRANSFERRED',
    jsonb_build_object('session_id', p_session_id, 'timestamp', NOW()),
    'info'
  ) ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

-- Update the approve_admin_contact_access function to handle revoked status
CREATE OR REPLACE FUNCTION public.approve_admin_contact_access(
  p_request_id uuid,
  p_decision text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve access requests';
  END IF;

  -- Validate decision
  IF p_decision NOT IN ('approved', 'denied', 'revoked') THEN
    RAISE EXCEPTION 'Invalid decision. Must be approved, denied, or revoked';
  END IF;

  UPDATE public.contact_access_justifications
  SET 
    status = p_decision,
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details, severity)
  VALUES (
    auth.uid(),
    'CONTACT_ACCESS_' || UPPER(p_decision),
    'contact_access_justification',
    p_request_id,
    jsonb_build_object('decision', p_decision, 'timestamp', NOW()),
    'info'
  ) ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;