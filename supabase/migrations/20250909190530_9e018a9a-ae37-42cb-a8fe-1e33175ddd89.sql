-- Phase 1: Critical Database Security Fixes (Corrected)

-- Fix partner_referrals anonymous insertion vulnerability first
-- Drop the overly permissive anonymous insertion policy
DROP POLICY IF EXISTS "Allow referral submissions" ON public.partner_referrals;

-- Add secure policy requiring authentication for referral submissions with rate limiting
DROP POLICY IF EXISTS "Authenticated users can submit referrals with rate limit" ON public.partner_referrals; CREATE POLICY "Authenticated users can submit referrals with rate limit" ON public.partner_referrals 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND check_enhanced_rate_limit(auth.uid(), 'referral_submit', 5)
);

-- Ensure organizations table has proper RLS (views inherit from underlying table)
-- Check if RLS is already enabled on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add policy for public access to verified organizations only
-- This will affect the views organizations_public and organizations_public_secure
DROP POLICY IF EXISTS "Public can view verified organizations only" ON public.organizations; CREATE POLICY "Public can view verified organizations only" ON public.organizations 
FOR SELECT 
USING (verified = true);

-- Log security policy changes for audit
INSERT INTO public.audit_log (
  user_id,
  action,
  p_table_name,
  sensitive_data_accessed,
  created_at
) VALUES (
  auth.uid(),
  'SECURITY_POLICY_UPDATE',
  'organizations',
  true,
  now()
),
(
  auth.uid(),
  'SECURITY_POLICY_UPDATE', 
  'partner_referrals',
  true,
  now()
) ON CONFLICT DO NOTHING;