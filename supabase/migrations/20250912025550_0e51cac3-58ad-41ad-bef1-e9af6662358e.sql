-- Fix all remaining functions with mutable search paths
-- These functions need proper search_path configuration

CREATE OR REPLACE FUNCTION public.log_contact_access(org_id UUID, contact_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    'CONTACT_ACCESS_' || upper(contact_type),
    'organizations',
    org_id,
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reveal_full_contact(org_id uuid)
RETURNS TABLE(email text, phone text, address text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_email text;
  contact_phone text;  
  contact_address text;
BEGIN
  -- Require admin authentication
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Admin privileges required for full contact reveal';
  END IF;

  -- Enhanced rate limiting for admin contact reveals
  IF NOT check_admin_p_action_limit('full_contact_reveal') THEN
    RAISE EXCEPTION 'Admin contact reveal rate limit exceeded';
  END IF;

  -- Get all contact information
  SELECT email, phone, address 
  INTO contact_email, contact_phone, contact_address
  FROM public.organizations 
  WHERE id = org_id AND verified = true;

  -- Log the full contact reveal with high security classification
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
    'ADMIN_FULL_CONTACT_REVEAL',
    'organizations',
    org_id,
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;

  -- Return the contact information
  RETURN QUERY SELECT 
    COALESCE(contact_email, 'Not available'::text) as email,
    COALESCE(contact_phone, 'Not available'::text) as phone,
    COALESCE(contact_address, 'Not available'::text) as address;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_organizations_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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