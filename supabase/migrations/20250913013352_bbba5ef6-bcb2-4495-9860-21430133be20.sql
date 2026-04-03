-- CRITICAL SECURITY FIX: Prevent anonymous access to sensitive contact information
-- The current public_basic_org_info policy allows anonymous users to access ALL columns
-- including email, phone, and address. This is a data breach risk.

-- Drop the vulnerable policy that exposes sensitive data to anonymous users
DROP POLICY IF EXISTS "public_basic_org_info" ON public.organizations;

-- Create a secure policy that uses a function to return only safe columns for anonymous access
DROP POLICY IF EXISTS "public_safe_org_info" ON public.organizations; CREATE POLICY "public_safe_org_info" ON public.organizations 
FOR SELECT 
USING (
  verified = true 
  AND auth.uid() IS NULL 
  AND false  -- Temporarily block direct table access for anonymous users
);

-- Create a secure view for anonymous public access with only safe columns
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
  updated_at
FROM public.organizations
WHERE verified = true;

-- Enable RLS on the view (though views inherit from base table)
-- Grant public access to the safe view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

-- Create a security definer function for safe public organization access
CREATE OR REPLACE FUNCTION public.get_safe_organizations_public()
 RETURNS TABLE(
   id uuid,
   name text,
   description text,
   website text,
   city text,
   state_code text,
   verified boolean,
   created_at timestamp with time zone,
   updated_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log anonymous access for monitoring
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    NULL,
    'ANONYMOUS_ORG_VIEW',
    'organizations',
    false,
    now()
  ) ON CONFLICT DO NOTHING;

  -- Return only safe, non-sensitive columns
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.description,
    o.website,
    o.city,
    o.state_code,
    o.verified,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$function$;

-- Update the existing safe function to ensure it has proper security
CREATE OR REPLACE FUNCTION public.get_organizations_public_safe()
 RETURNS TABLE(id uuid, name text, description text, website text, city text, state_code text, verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log public access for monitoring (no sensitive data accessed)
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    NULL,
    'PUBLIC_ORG_VIEW',
    'organizations',
    false,
    now()
  ) ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.description,
    o.website,
    o.city,
    o.state_code,
    o.verified,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$function$;