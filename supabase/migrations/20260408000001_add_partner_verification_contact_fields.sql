-- Add missing contact fields to partner_verifications table
-- These fields are required by the verification request form

ALTER TABLE public.partner_verifications
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Ensure INSERT policy exists for authenticated users
DROP POLICY IF EXISTS "Authenticated users can create verifications" ON public.partner_verifications;
CREATE POLICY "Authenticated users can create verifications" ON public.partner_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can view their own verifications
DROP POLICY IF EXISTS "Users can view own verifications" ON public.partner_verifications;
CREATE POLICY "Users can view own verifications" ON public.partner_verifications
  FOR SELECT
  USING (user_id = auth.uid());
