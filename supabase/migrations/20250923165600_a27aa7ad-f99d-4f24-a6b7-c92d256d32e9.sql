-- Fix Database Function Security and Learning Content Access (Part 2)
-- Drop existing function first to avoid parameter name conflicts

-- Drop existing function that has parameter conflicts
-- Removed DROP FUNCTION to avoid dependency issues: public.mask_contact_text(text);

-- 1. Fix get_current_user_role function with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 2. Fix is_user_admin function with secure search_path
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean 
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND role = 'admin'
  );
END;
$$;

-- 3. Secure Learning Content - Remove Anonymous Access
-- Update learning pathways to require authentication
DROP POLICY IF EXISTS "Anyone can view learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Learning pathways select authenticated" ON public.learning_pathways;

DROP POLICY IF EXISTS "Authenticated users can view learning pathways" ON public.learning_pathways; CREATE POLICY "Authenticated users can view learning pathways" ON public.learning_pathways 
FOR SELECT 
TO authenticated
USING (true);

-- Update learning modules to require authentication  
DROP POLICY IF EXISTS "Anyone can view learning modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Learning modules select authenticated" ON public.learning_modules;

DROP POLICY IF EXISTS "Authenticated users can view learning modules" ON public.learning_modules; CREATE POLICY "Authenticated users can view learning modules" ON public.learning_modules
FOR SELECT 
TO authenticated
USING (true);

-- 4. Add function to mask sensitive contact information (recreated with correct parameter)
CREATE OR REPLACE FUNCTION public.mask_contact_text(contact_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF contact_value IS NULL OR LENGTH(contact_value) = 0 THEN
    RETURN 'Not available';
  END IF;
  
  -- Mask email addresses
  IF contact_value LIKE '%@%' THEN
    RETURN LEFT(contact_value, 2) || '***@***' || RIGHT(contact_value, 4);
  END IF;
  
  -- Mask phone numbers
  IF contact_value ~ '^[\+\d\s\-\(\)\.]+$' THEN
    RETURN '***-***-' || RIGHT(regexp_replace(contact_value, '[^\d]', '', 'g'), 4);
  END IF;
  
  -- Default masking for other contact types
  RETURN LEFT(contact_value, 2) || '***' || RIGHT(contact_value, 2);
END;
$$;

-- 5. Enhanced Session Security - Add session validation
CREATE OR REPLACE FUNCTION public.validate_anonymous_session(session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session and check if valid
  SELECT * INTO session_record
  FROM public.anonymous_sessions
  WHERE anonymous_sessions.session_token = validate_anonymous_session.session_token
  AND expires_at > now()
  AND trial_expired = false;
  
  RETURN FOUND;
END;
$$;

-- 6. Update audit logging to be more secure
CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text,
  action_name text,
  record_id uuid DEFAULT NULL,
  sensitive_data_accessed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    action_name,
    log_sensitive_access.p_table_name,
    log_sensitive_access.p_record_id,
    p_sensitive_data,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;