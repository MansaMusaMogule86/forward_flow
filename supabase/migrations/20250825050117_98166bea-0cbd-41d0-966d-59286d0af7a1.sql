-- First, let's see what policies currently exist
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'partner_referrals';

-- Drop and recreate all policies to ensure they are correct
DROP POLICY IF EXISTS "Admins can view all partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Admins can update partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Anyone can insert partner referrals" ON public.partner_referrals;

-- Recreate policies with proper restrictions
-- Only admins can view partner referrals (SELECT)
DROP POLICY IF EXISTS "Only admins can view partner referrals" ON public.partner_referrals; CREATE POLICY "Only admins can view partner referrals" ON public.partner_referrals 
FOR SELECT 
USING (is_user_admin());

-- Only admins can update partner referrals 
DROP POLICY IF EXISTS "Only admins can update partner referrals" ON public.partner_referrals; CREATE POLICY "Only admins can update partner referrals" ON public.partner_referrals 
FOR UPDATE 
USING (is_user_admin());

-- Allow anyone to insert partner referrals (for submission forms)
DROP POLICY IF EXISTS "Anyone can submit partner referrals" ON public.partner_referrals; CREATE POLICY "Anyone can submit partner referrals" ON public.partner_referrals 
FOR INSERT 
WITH CHECK (true);

-- Ensure no DELETE policy exists (prevent data deletion)
DROP POLICY IF EXISTS "Delete partner referrals" ON public.partner_referrals;