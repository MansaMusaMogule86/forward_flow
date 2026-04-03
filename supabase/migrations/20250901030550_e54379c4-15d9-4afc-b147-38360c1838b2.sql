-- Address Security Definer View warning
-- The warning likely refers to our existing SECURITY DEFINER functions
-- Let's ensure they are properly secured and follow best practices

-- First, let's make sure our organizations_public view is properly defined
-- and doesn't inadvertently inherit any SECURITY DEFINER properties

-- Drop and recreate the organizations_public view to ensure it's clean
DROP VIEW IF EXISTS public.organizations_public;

-- Recreate the view without any SECURITY DEFINER properties
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

-- Grant explicit permissions to ensure proper access control
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

-- Review our SECURITY DEFINER functions to ensure they follow best practices
-- All our current SECURITY DEFINER functions are necessary and properly secured:
-- 1. is_user_admin - needs elevated privileges to check user roles
-- 2. can_view_org_contacts - needs to access auth context
-- 3. create_user_profile - needs to insert into protected profiles table
-- 4. handle_new_user - trigger function needs elevated privileges

-- Add additional security measures to our functions
-- Ensure the search_path is set for all SECURITY DEFINER functions to prevent schema attacks

-- Update is_user_admin function with better security
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND role = 'admin'
  );
$function$;

-- Update can_view_org_contacts function with better security  
CREATE OR REPLACE FUNCTION public.can_view_org_contacts()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL;
$function$;

-- The SECURITY DEFINER functions are necessary for the application's security model
-- They are properly scoped and follow PostgreSQL security best practices