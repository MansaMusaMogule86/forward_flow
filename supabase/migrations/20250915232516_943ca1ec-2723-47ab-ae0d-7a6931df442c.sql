-- Fix database functions by making them properly volatile for audit logging
-- Update get_organizations_public_safe function to be volatile
CREATE OR REPLACE FUNCTION public.get_organizations_public_safe()
 RETURNS TABLE(id uuid, name text, description text, website text, city text, state_code text, verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update get_organizations_with_contacts_secure function to be volatile
CREATE OR REPLACE FUNCTION public.get_organizations_with_contacts_secure()
 RETURNS TABLE(id uuid, name text, description text, website text, city text, state_code text, verified boolean, email text, phone text, address text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update get_organizations_public function to be volatile
CREATE OR REPLACE FUNCTION public.get_organizations_public()
 RETURNS TABLE(id uuid, name text, description text, website text, city text, state_code text, verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access for audit purposes
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'PUBLIC_ORG_ACCESS',
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