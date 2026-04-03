-- Fix security vulnerability: Restrict SELECT access to business contact information
-- Only admins should be able to view submitted partner referrals and partnership requests

-- Drop existing broad policies and replace with specific ones
DROP POLICY IF EXISTS "Admins can view and manage referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Admins can view and manage partnership requests" ON public.partnership_requests;

-- Create specific SELECT policies for admins only
DROP POLICY IF EXISTS "Admins can view partner referrals" ON public.partner_referrals; CREATE POLICY "Admins can view partner referrals" ON public.partner_referrals 
FOR SELECT 
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update partner referrals" ON public.partner_referrals; CREATE POLICY "Admins can update partner referrals" ON public.partner_referrals 
FOR UPDATE 
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete partner referrals" ON public.partner_referrals; CREATE POLICY "Admins can delete partner referrals" ON public.partner_referrals 
FOR DELETE 
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can view partnership requests" ON public.partnership_requests 
FOR SELECT 
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can update partnership requests" ON public.partnership_requests 
FOR UPDATE 
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can delete partnership requests" ON public.partnership_requests 
FOR DELETE 
TO authenticated
USING (is_user_admin(auth.uid()));