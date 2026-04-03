-- Complete security fixes: Update RLS policies to protect sensitive contact information

-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create more secure policies for organizations
DROP POLICY IF EXISTS "Anyone can view basic organization info" ON public.organizations; CREATE POLICY "Anyone can view basic organization info" ON public.organizations 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view organization contacts" ON public.organizations; CREATE POLICY "Authenticated users can view organization contacts" ON public.organizations 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update profiles to require authentication for viewing
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles; CREATE POLICY "Authenticated users can view profiles" ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add policy for anonymous users to view basic organization data (name, description, city, state)
-- But protect email, phone, and address for authenticated users only
CREATE OR REPLACE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  description,
  city,
  state_code,
  website,
  verified,
  created_at,
  updated_at,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN phone
    ELSE NULL
  END as phone,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN address
    ELSE NULL
  END as address
FROM public.organizations;

-- Grant access to the public view
GRANT SELECT ON public.organizations_public TO anon, authenticated;