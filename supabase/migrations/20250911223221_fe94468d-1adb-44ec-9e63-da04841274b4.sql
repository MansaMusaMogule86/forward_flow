-- Phase 1: Critical Security Fixes for Organizations Table
-- Drop all existing conflicting RLS policies on organizations table
DROP POLICY IF EXISTS "Authenticated users can view organization contacts" ON public.organizations;
DROP POLICY IF EXISTS "Public can view basic organization info" ON public.organizations;
DROP POLICY IF EXISTS "Public read access to verified organizations" ON public.organizations;
DROP POLICY IF EXISTS "orgs_deny_unauthenticated" ON public.organizations;
DROP POLICY IF EXISTS "orgs_read_authenticated_own" ON public.organizations;

-- Create secure, consolidated RLS policies for organizations
-- Policy 1: Allow owners to manage their own organizations
DROP POLICY IF EXISTS "owners_can_manage_own_orgs" ON public.organizations; CREATE POLICY "owners_can_manage_own_orgs" ON public.organizations
FOR ALL 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy 2: Allow admins to manage all organizations
DROP POLICY IF EXISTS "admins_can_manage_all_orgs" ON public.organizations; CREATE POLICY "admins_can_manage_all_orgs" ON public.organizations
FOR ALL 
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- Policy 3: Allow public access to basic organization info (NO contact details)
DROP POLICY IF EXISTS "public_basic_org_info" ON public.organizations; CREATE POLICY "public_basic_org_info" ON public.organizations
FOR SELECT 
USING (
  verified = true AND 
  auth.uid() IS NULL
);

-- Policy 4: Allow authenticated users to access contact info with rate limiting and audit logging
DROP POLICY IF EXISTS "authenticated_contact_access" ON public.organizations; CREATE POLICY "authenticated_contact_access" ON public.organizations
FOR SELECT 
USING (
  verified = true AND 
  auth.uid() IS NOT NULL AND
  check_enhanced_rate_limit(auth.uid(), 'org_contact_access', 20)
);

-- Create secure function to get public organization data (no contacts)
CREATE OR REPLACE FUNCTION public.get_organizations_public_safe()
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
AS $$
BEGIN
  -- Log public access for monitoring
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
$$;

-- Create secure function for authenticated contact access
CREATE OR REPLACE FUNCTION public.get_organizations_with_contacts_secure()
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  website text, 
  city text, 
  state_code text, 
  verified boolean, 
  email text, 
  phone text, 
  address text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for contact access';
  END IF;

  -- Enhanced rate limiting for contact access
  IF NOT check_enhanced_rate_limit(auth.uid(), 'contact_text_access', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded for contact access';
  END IF;

  -- Log sensitive contact access with detailed audit trail
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    'contact_text_ACCESS',
    'organizations',
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;

  -- Check for suspicious activity patterns
  PERFORM detect_suspicious_activity();

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.description,
    o.website,
    o.city,
    o.state_code,
    o.verified,
    CASE 
      WHEN is_user_admin() THEN o.email
      ELSE mask_contact_text(o.email)
    END as email,
    CASE 
      WHEN is_user_admin() THEN o.phone
      ELSE mask_contact_text(o.phone)
    END as phone,
    o.address,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$$;

-- Enhanced security function for admin contact reveal
CREATE OR REPLACE FUNCTION public.reveal_organization_contact(org_id uuid, contact_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  contact_value text;
BEGIN
  -- Require admin authentication
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Check admin p_action limits
  IF NOT check_admin_p_action_limit('contact_reveal') THEN
    RAISE EXCEPTION 'Admin p_action rate limit exceeded';
  END IF;

  -- Validate contact type
  IF contact_type NOT IN ('email', 'phone') THEN
    RAISE EXCEPTION 'Invalid contact type';
  END IF;

  -- Get the contact value
  IF contact_type = 'email' THEN
    SELECT email INTO contact_value FROM public.organizations WHERE id = org_id AND verified = true;
  ELSE
    SELECT phone INTO contact_value FROM public.organizations WHERE id = org_id AND verified = true;
  END IF;

  -- Log the admin contact reveal action
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    'ADMIN_CONTACT_REVEAL_' || upper(contact_type),
    'organizations',
    org_id,
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;

  RETURN COALESCE(contact_value, 'Not available');
END;
$$;

-- Create trigger for organizations table to audit all modifications
CREATE OR REPLACE FUNCTION public.audit_organizations_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all changes to organizations table
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP || '_ORGANIZATION',
    'organizations',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') AND (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL) THEN true ELSE false END,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS audit_organizations_trigger ON public.organizations;
CREATE TRIGGER audit_organizations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION audit_organizations_changes();