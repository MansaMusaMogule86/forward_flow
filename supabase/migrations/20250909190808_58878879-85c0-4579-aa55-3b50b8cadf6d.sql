-- Phase 2: Address Sensitive Contact Data Exposure

-- Remove the overly broad public access policy
DROP POLICY IF EXISTS "Public can view verified organizations only" ON public.organizations;

-- Create more restrictive policies for organizations table
-- Allow public to see basic org info but not contact details
DROP POLICY IF EXISTS "Public can view basic organization info" ON public.organizations; CREATE POLICY "Public can view basic organization info" ON public.organizations 
FOR SELECT 
USING (verified = true AND can_view_org_contacts() = false);

-- Allow authenticated users to see contact details with rate limiting
DROP POLICY IF EXISTS "Authenticated users can view organization contacts" ON public.organizations; CREATE POLICY "Authenticated users can view organization contacts" ON public.organizations 
FOR SELECT 
USING (
  verified = true 
  AND auth.uid() IS NOT NULL 
  AND check_enhanced_rate_limit(auth.uid(), 'org_contact_access', 20)
);

-- Create a truly public-safe view for organizations without sensitive data
CREATE OR REPLACE VIEW public.organizations_safe_public AS
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

-- Grant public access to the safe view
GRANT SELECT ON public.organizations_safe_public TO anon;
GRANT SELECT ON public.organizations_safe_public TO authenticated;

-- Update existing public views to use contact masking for anonymous users
CREATE OR REPLACE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  description,
  website,
  city,
  state_code,
  verified,
  created_at,
  updated_at,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN email
    ELSE mask_contact_text(email)
  END as email,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN phone  
    ELSE mask_contact_text(phone)
  END as phone
FROM public.organizations
WHERE verified = true;