-- Fix critical security vulnerability in partner_referrals table
-- Remove overly permissive policy that allows anyone to view personal referral information

-- Drop the existing insecure policy that allows public access
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.partner_referrals;

-- Create secure policy that only allows admins to view referrals
-- This is needed for the admin dashboard functionality
DROP POLICY IF EXISTS "Only admins can view referrals for management" ON public.partner_referrals; CREATE POLICY "Only admins can view referrals for management" ON public.partner_referrals
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_admin(auth.uid())
  AND check_admin_rate_limit()
);

-- Ensure users can still submit referrals (keep existing insert policies)
-- The existing insert policies are already properly secured

-- Log this security fix in audit log
DO $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'SECURITY_FIX_REFERRAL_ACCESS',
    'partner_referrals',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if audit log fails, security fix is more important
  NULL;
END $$;