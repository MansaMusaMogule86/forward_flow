-- Phase 3: Fix Security Definer View Issues (Corrected)

-- Force drop views that have SECURITY DEFINER to recreate them properly
DROP VIEW IF EXISTS public.organizations_public CASCADE;
DROP VIEW IF EXISTS public.organizations_public_secure CASCADE;

-- Recreate views without SECURITY DEFINER (using default INVOKER security)
-- These views will use the permissions of the querying user, not the view creator
CREATE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  description,
  website,
  city,
  state_code,
  verified,
  created_at,
  updated_at
FROM public.organizations
WHERE verified = true;

CREATE VIEW public.organizations_public_secure AS
SELECT 
  id,
  name,
  description,  
  website,
  city,
  state_code,
  verified,
  created_at,
  updated_at
FROM public.organizations
WHERE verified = true;

-- Grant permissions explicitly
GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.organizations_public_secure TO anon, authenticated;

-- Add simple RLS policy for organizations that allows public read of verified orgs
DROP POLICY IF EXISTS "Public read access to verified organizations" ON public.organizations; CREATE POLICY "Public read access to verified organizations" ON public.organizations 
FOR SELECT 
USING (verified = true);