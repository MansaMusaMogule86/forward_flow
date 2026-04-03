-- Final security lockdown - remove redundant policies and ensure complete protection

-- Clean up organizations table policies
DROP POLICY IF EXISTS "Authenticated users can view organizations through secure function only" ON public.organizations;
DROP POLICY IF EXISTS "Secure organization access with field-level control" ON public.organizations;

-- Create final secure policy for organizations - only allow access through secure functions
DROP POLICY IF EXISTS "Organizations require secure function access only" ON public.organizations; CREATE POLICY "Organizations require secure function access only" ON public.organizations
FOR SELECT
USING (
  -- Only allow direct access for admin p_actions, all other access must go through secure functions
  auth.uid() IS NOT NULL 
  AND is_user_admin(auth.uid())
  AND check_admin_rate_limit()
);

-- Clean up resources table policies  
DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
DROP POLICY IF EXISTS "Secure resource access with contact protection" ON public.resources;

-- Create final secure policy for resources - admin access only for direct table access
DROP POLICY IF EXISTS "Resources require admin access for direct table queries" ON public.resources; CREATE POLICY "Resources require admin access for direct table queries" ON public.resources
FOR SELECT
USING (
  -- Only admins can directly query the resources table
  auth.uid() IS NOT NULL 
  AND is_user_admin(auth.uid())
  AND check_admin_rate_limit()
);

-- Allow admins to manage resources
DROP POLICY IF EXISTS "Admins can manage resources securely" ON public.resources; CREATE POLICY "Admins can manage resources securely" ON public.resources
FOR ALL
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

-- Create restrictive policies for anonymous users on both tables
DROP POLICY IF EXISTS "Block anonymous resource access completely" ON public.resources; CREATE POLICY "Block anonymous resource access completely" ON public.resources
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure learning and other public tables remain accessible as needed
-- (These don't contain sensitive contact information)

-- Log final security lockdown
INSERT INTO public.audit_log (
  user_id,
  action,
  p_table_name,
  sensitive_data_accessed,
  created_at
) VALUES (
  auth.uid(),
  'FINAL_SECURITY_LOCKDOWN_COMPLETE',
  'organizations_and_resources',
  true,
  now()
) ON CONFLICT DO NOTHING;

-- Create information about secure access methods for developers
COMMENT ON FUNCTION public.get_organizations_secure() IS 'Secure function for authenticated organization access with field-level contact masking';
COMMENT ON FUNCTION public.get_resources_secure() IS 'Secure function for authenticated resource access with contact information protection';
COMMENT ON FUNCTION public.get_resources_public() IS 'Public function for anonymous resource access without contact information';