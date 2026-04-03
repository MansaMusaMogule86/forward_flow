-- Fix Core Security Issues - Database Functions and Learning Content

-- Drop conflicting functions first
-- Removed DROP FUNCTION to avoid dependency issues: public.mask_contact_text(text);
-- Removed DROP FUNCTION to avoid dependency issues: public.log_sensitive_access(text,text,uuid,boolean);

-- 1. Fix function search_path security issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid();
$$;

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

-- 2. Secure Learning Content - Remove Anonymous Access
DROP POLICY IF EXISTS "Anyone can view learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Learning pathways select authenticated" ON public.learning_pathways;

DROP POLICY IF EXISTS "Authenticated users can view learning pathways" ON public.learning_pathways; CREATE POLICY "Authenticated users can view learning pathways" ON public.learning_pathways 
FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view learning modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Learning modules select authenticated" ON public.learning_modules;

DROP POLICY IF EXISTS "Authenticated users can view learning modules" ON public.learning_modules; CREATE POLICY "Authenticated users can view learning modules" ON public.learning_modules
FOR SELECT 
TO authenticated
USING (true);

-- 3. Add session validation function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_anonymous_session(session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT * INTO session_record
  FROM public.anonymous_sessions
  WHERE anonymous_sessions.session_token = validate_anonymous_session.session_token
  AND expires_at > now()
  AND trial_expired = false;
  
  RETURN FOUND;
END;
$$;