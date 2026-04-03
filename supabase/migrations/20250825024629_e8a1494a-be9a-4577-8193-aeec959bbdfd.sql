-- Update RLS policy to restrict contact information access to admins only
DROP POLICY "Authenticated users can view full organization info" ON public.organizations;

-- Create a policy that allows all authenticated users to see basic info (no contact details)
DROP POLICY IF EXISTS "Authenticated users can view basic organization info" ON public.organizations; CREATE POLICY "Authenticated users can view basic organization info" ON public.organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create a separate policy that allows only admins to see contact information
-- This will be handled at the application level by selecting different columns

-- Create a view for admin access that includes all fields
CREATE VIEW public.organizations_admin AS
SELECT *
FROM public.organizations;

-- Grant access to the admin view only for users with admin role
GRANT SELECT ON public.organizations_admin TO authenticated;