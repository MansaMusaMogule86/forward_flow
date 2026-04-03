-- Fix partner_referrals security by creating proper admin setup
-- and strengthening RLS policies

-- First, let's create a function to safely create an admin user
-- This should be run after authentication is set up
CREATE OR REPLACE FUNCTION public.create_admin_user(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID from auth.users based on email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email 
  LIMIT 1;
  
  -- If user exists, make them admin
  IF admin_user_id IS NOT NULL THEN
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
  ELSE
    RAISE EXCEPTION 'User with email % not found in auth.users', admin_email;
  END IF;
END;
$$;

-- Strengthen partner_referrals RLS policies
-- Drop existing policies and recreate with better security
DROP POLICY IF EXISTS "Anyone can submit partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Only admins can update partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "referrals_admin_select_with_limits" ON public.partner_referrals;
DROP POLICY IF EXISTS "referrals_deny_unauthenticated" ON public.partner_referrals;

-- Create more secure RLS policies for partner_referrals
-- 1. Allow anyone to submit referrals (business requirement)
DROP POLICY IF EXISTS "Allow referral submissions" ON public.partner_referrals; CREATE POLICY "Allow referral submissions" ON public.partner_referrals
FOR INSERT
TO public
WITH CHECK (true);

-- 2. Only authenticated admins can view referrals with enhanced security
DROP POLICY IF EXISTS "Admins can view referrals with security checks" ON public.partner_referrals; CREATE POLICY "Admins can view referrals with security checks" ON public.partner_referrals
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  is_user_admin(auth.uid()) AND
  check_admin_rate_limit() AND
  -- Log every access attempt
  (log_sensitive_access('partner_referrals', 'SELECT', id, true) IS NULL)
);

-- 3. Only authenticated admins can update referrals
DROP POLICY IF EXISTS "Admins can update referrals" ON public.partner_referrals; CREATE POLICY "Admins can update referrals" ON public.partner_referrals
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  is_user_admin(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  is_user_admin(auth.uid())
);

-- 4. Prevent any access by anonymous users
DROP POLICY IF EXISTS "Deny all anonymous access" ON public.partner_referrals; CREATE POLICY "Deny all anonymous access" ON public.partner_referrals
FOR ALL
TO anon
USING (false);

-- 5. Deny delete p_actions completely (data preservation)
DROP POLICY IF EXISTS "Prevent data deletion" ON public.partner_referrals; CREATE POLICY "Prevent data deletion" ON public.partner_referrals
FOR DELETE
TO authenticated
USING (false);

-- Create a security function to validate admin access patterns
CREATE OR REPLACE FUNCTION public.validate_admin_access_pattern()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_access_count integer;
  user_id uuid := auth.uid();
BEGIN
  -- Check for suspicious access patterns
  SELECT COUNT(*) INTO recent_access_count
  FROM audit_log
  WHERE audit_log.user_id = validate_admin_access_pattern.user_id
  AND action LIKE '%PARTNER_REFERRAL%'
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Alert if more than 20 accesses in 10 minutes
  IF recent_access_count > 20 THEN
    INSERT INTO audit_log (
      user_id,
      action,
      p_table_name,
      sensitive_data_accessed,
      created_at
    ) VALUES (
      user_id,
      'SUSPICIOUS_ACCESS_PATTERN_DETECTED',
      'partner_referrals',
      true,
      now()
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;