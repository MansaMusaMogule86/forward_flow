-- First, update the existing public policy to restrict full table access to authenticated users only
DROP POLICY "Public can view basic organization info" ON public.organizations;

-- Create a new policy that only allows authenticated users to see full organization data
DROP POLICY IF EXISTS "Authenticated users can view full organization info" ON public.organizations; CREATE POLICY "Authenticated users can view full organization info" ON public.organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create a public view that exposes only basic, non-sensitive organization information
CREATE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  description,
  city,
  state_code,
  website,
  verified,
  created_at,
  updated_at
FROM public.organizations;

-- Allow public access to the view
GRANT SELECT ON public.organizations_public TO anon;

-- Keep the admin policy unchanged
-- (Admins can manage organizations policy already exists)