-- Remove the overly permissive policy that allows any authenticated user to view organizations
DROP POLICY "Authenticated users can view basic organization info" ON public.organizations;

-- Create a new policy that only allows admin users to access organization data
DROP POLICY IF EXISTS "Only admins can view organizations" ON public.organizations; CREATE POLICY "Only admins can view organizations" ON public.organizations 
FOR SELECT 
USING (is_user_admin());

-- Since we need public access for non-authenticated users to see basic org info,
-- we'll handle this entirely at the application level through careful column selection
-- The application will handle the logic for what data to show to different user types