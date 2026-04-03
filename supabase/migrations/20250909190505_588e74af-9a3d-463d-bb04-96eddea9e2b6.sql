-- Phase 1: Critical Database Security Fixes

-- Enable RLS on organizations_public table
-- Removed illegal RLS enablement on view

-- Enable RLS on organizations_public_secure table  
ALTER TABLE public.organizations_public_secure ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for organizations_public - only verified organizations
-- Removed illegal policy drop on view -- Removed illegal policy on view;

-- Add SELECT policy for organizations_public_secure - only verified organizations
DROP POLICY IF EXISTS "Public can view verified organizations secure" ON public.organizations_public_secure; -- Removed illegal policy on view;

-- Fix partner_referrals anonymous insertion vulnerability
-- Drop the overly permissive anonymous insertion policy
DROP POLICY IF EXISTS "Allow referral submissions" ON public.partner_referrals;

-- Add secure policy requiring authentication for referral submissions
DROP POLICY IF EXISTS "Authenticated users can submit referrals" ON public.partner_referrals; CREATE POLICY "Authenticated users can submit referrals" ON public.partner_referrals 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add rate limiting to referral submissions
DROP POLICY IF EXISTS "Rate limited referral submissions" ON public.partner_referrals; CREATE POLICY "Rate limited referral submissions" ON public.partner_referrals 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND check_enhanced_rate_limit(auth.uid(), 'referral_submit', 5)
);

-- Replace the previous policy with the rate-limited one
DROP POLICY IF EXISTS "Authenticated users can submit referrals" ON public.partner_referrals;