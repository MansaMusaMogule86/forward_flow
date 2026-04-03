-- Fix the security linter warning by removing the potentially risky view
-- and relying solely on security definer functions for safe access

-- Drop the view that triggered the security warning
DROP VIEW IF EXISTS public.organizations_public;

-- Revoke any grants that were made to the view
REVOKE ALL ON public.organizations_public FROM anon;
REVOKE ALL ON public.organizations_public FROM authenticated;

-- The security definer functions we created are the proper way to handle this
-- They provide controlled access with audit logging and proper column filtering

-- Ensure the restrictive policy is properly set to block all direct anonymous access
DROP POLICY IF EXISTS "public_safe_org_info" ON public.organizations;

DROP POLICY IF EXISTS "block_anonymous_direct_access" ON public.organizations; CREATE POLICY "block_anonymous_direct_access" ON public.organizations 
FOR SELECT 
USING (
  -- Anonymous users cannot access the table directly - they must use functions
  auth.uid() IS NOT NULL
);