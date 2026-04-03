-- Fix SECURITY DEFINER views by replacing with proper functions
-- Drop the problematic views first
DROP VIEW IF EXISTS public.organizations_public;
DROP VIEW IF EXISTS public.organizations_public_secure;
DROP VIEW IF EXISTS public.organizations_safe_public;

-- Create secure functions to replace the views
CREATE OR REPLACE FUNCTION public.get_organizations_public()
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
SET search_path = public
AS $$
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
$$;

-- Function for authenticated users with contact info (with masking)
CREATE OR REPLACE FUNCTION public.get_organizations_with_contacts()
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
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limits
  IF NOT check_enhanced_rate_limit(auth.uid(), 'org_contact_access', 20) THEN
    RAISE EXCEPTION 'Rate limit exceeded for contact access';
  END IF;

  -- Log sensitive access
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'CONTACT_ACCESS',
    'organizations',
    true,
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
    CASE 
      WHEN is_user_admin(auth.uid()) THEN o.email
      ELSE mask_contact_text(o.email)
    END as email,
    CASE 
      WHEN is_user_admin(auth.uid()) THEN o.phone
      ELSE mask_contact_text(o.phone)
    END as phone,
    o.address,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$$;

-- Enhanced audit logging for payment p_actions
CREATE OR REPLACE FUNCTION public.log_payment_p_action(
  p_action_type text,
  payment_id uuid DEFAULT NULL,
  amount_cents integer DEFAULT NULL,
  additional_data jsonb DEFAULT '{}'::jsonb
)
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
    created_at
  ) VALUES (
    auth.uid(),
    'PAYMENT_' || upper(p_action_type),
    'payments',
    payment_id,
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Enhanced contact data protection function
CREATE OR REPLACE FUNCTION public.get_masked_organization_contact(org_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  masked_email text,
  masked_phone text,
  city text,
  state_code text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check authentication and rate limits
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT check_enhanced_rate_limit(auth.uid(), 'masked_contact_access', 50) THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  -- Log access
  PERFORM log_sensitive_access('organizations', 'MASKED_CONTACT_VIEW', org_id, true);

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    mask_contact_text(o.email) as masked_email,
    mask_contact_text(o.phone) as masked_phone,
    o.city,
    o.state_code
  FROM public.organizations o
  WHERE o.id = org_id AND o.verified = true;
END;
$$;

-- Create indexes for better performance on audit logs
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action_time 
ON public.audit_log (user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_sensitive_access 
ON public.audit_log (sensitive_data_accessed, created_at DESC) 
WHERE sensitive_data_accessed = true;

-- Enhanced rate limiting for admin p_actions
CREATE OR REPLACE FUNCTION public.check_admin_p_action_limit(p_action_type text DEFAULT 'general')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p_action_count integer;
    user_id uuid := auth.uid();
BEGIN
    -- Verify admin status
    IF NOT is_user_admin(user_id) THEN
        RETURN false;
    END IF;
    
    -- Check p_action-specific limits
    SELECT COUNT(*) INTO p_action_count
    FROM public.audit_log
    WHERE audit_log.user_id = check_admin_p_action_limit.user_id
    AND action LIKE '%' || upper(p_action_type) || '%'
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Different limits for different p_actions
    CASE p_action_type
        WHEN 'contact_reveal' THEN
            RETURN p_action_count < 100;
        WHEN 'status_update' THEN
            RETURN p_action_count < 200;
        ELSE
            RETURN p_action_count < 50;
    END CASE;
END;
$$;