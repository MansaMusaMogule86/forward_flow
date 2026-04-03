-- Fix function search path security issues
-- Drop and reCREATE OR REPLACE FUNCTIONs to ensure proper search_path settings

-- Drop existing functions that need to be updated
-- Removed DROP FUNCTION to avoid dependency issues: public.check_enhanced_rate_limit(uuid, text, integer);
-- Removed DROP FUNCTION to avoid dependency issues: public.mask_contact_text(text);
-- Removed DROP FUNCTION to avoid dependency issues
-- Removed DROP FUNCTION to avoid dependency issues: public.log_sensitive_access(text, text, uuid, boolean);
-- Removed DROP FUNCTION to avoid dependency issues: public.check_admin_rate_limit();

-- ReCREATE OR REPLACE FUNCTIONs with proper search_path security
CREATE OR REPLACE FUNCTION public.mask_contact_text(contact text)
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER STABLE 
SET search_path = 'public'
AS $$
BEGIN
  IF contact IS NULL OR LENGTH(TRIM(contact)) = 0 THEN
    RETURN 'Contact information available';
  END IF;
  
  -- Check if it's an email (contains @)
  IF position('@' in contact) > 0 THEN
    RETURN SUBSTRING(contact, 1, 2) || '***@' || SPLIT_PART(contact, '@', 2);
  END IF;
  
  -- Check if it's a phone (contains digits and common phone chars)
  IF contact ~ '^[\d\s\-\(\)\+\.]+$' THEN
    RETURN SUBSTRING(contact, 1, 3) || '***' || SUBSTRING(contact, LENGTH(contact) - 3, 4);
  END IF;
  
  -- For other contact info, mask middle portion
  RETURN SUBSTRING(contact, 1, 2) || '***' || SUBSTRING(contact, LENGTH(contact) - 1, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER STABLE 
SET search_path = 'public'
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND role = 'admin'::app_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(p_user_id uuid, p_operation text, p_max_attempts integer DEFAULT 10)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER STABLE 
SET search_path = 'public'
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Get attempt count for the last 15 minutes
  SELECT COUNT(*) INTO attempt_count
  FROM public.audit_log
  WHERE user_id = p_user_id
  AND action LIKE '%' || upper(p_operation) || '%'
  AND created_at > now() - interval '15 minutes';
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, action text, record_id uuid DEFAULT NULL, p_sensitive boolean DEFAULT true)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_sensitive,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_admin_rate_limit()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER STABLE 
SET search_path = 'public'
AS $$
DECLARE
  recent_actions integer;
BEGIN
  -- Check admin actions in last 5 minutes
  SELECT COUNT(*) INTO recent_actions
  FROM public.audit_log
  WHERE user_id = auth.uid()
  AND created_at > now() - interval '5 minutes';
  
  -- Allow up to 50 admin actions per 5 minutes
  RETURN recent_actions < 50;
END;
$$;