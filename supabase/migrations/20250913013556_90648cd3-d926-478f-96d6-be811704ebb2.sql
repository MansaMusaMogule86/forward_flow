-- Fix the security linter warning by ensuring anonymous users cannot access organizations directly
-- They must use the secure functions which only return safe columns with audit logging

-- Create proper restrictive policy for anonymous access
DROP POLICY IF EXISTS "public_safe_org_info" ON public.organizations;

DROP POLICY IF EXISTS "block_anonymous_direct_access" ON public.organizations; CREATE POLICY "block_anonymous_direct_access" ON public.organizations 
FOR SELECT 
USING (
  -- Anonymous users cannot access the table directly - they must use security definer functions
  -- Only authenticated users can access through normal policies
  auth.uid() IS NOT NULL
);