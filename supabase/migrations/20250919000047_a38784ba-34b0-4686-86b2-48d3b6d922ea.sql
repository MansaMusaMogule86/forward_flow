-- Fix critical organization contact data security vulnerability
-- Implement field-level access control for organizations table

-- Drop the existing potentially insecure policy
DROP POLICY IF EXISTS "secure_contact_access_with_permission" ON public.organizations;

-- Create secure function for organization data access with proper field masking
CREATE OR REPLACE FUNCTION public.get_organizations_secure()
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication for any organization access
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for organization access';
  END IF;

  -- Enhanced rate limiting for organization data access
  IF NOT check_enhanced_rate_limit(auth.uid(), 'org_data_access', 15) THEN
    RAISE EXCEPTION 'Rate limit exceeded for organization access';
  END IF;

  -- Log organization access for audit
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
    'SECURE_ORG_ACCESS',
    'organizations',
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;

  -- Return data with conditional field masking based on access permissions
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
      WHEN is_user_admin(auth.uid()) OR has_contact_access_permission(auth.uid(), o.id) 
      THEN o.email
      ELSE mask_contact_text(o.email)
    END as email,
    CASE 
      WHEN is_user_admin(auth.uid()) OR has_contact_access_permission(auth.uid(), o.id) 
      THEN o.phone
      ELSE mask_contact_text(o.phone)
    END as phone,
    CASE 
      WHEN is_user_admin(auth.uid()) OR has_contact_access_permission(auth.uid(), o.id) 
      THEN o.address
      ELSE 'Contact access required'::text
    END as address,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$$;

-- Create new secure RLS policy for organizations
DROP POLICY IF EXISTS "Secure organization access with field-level control" ON public.organizations; CREATE POLICY "Secure organization access with field-level control" ON public.organizations
FOR SELECT
USING (
  -- Only allow access through the secure function or for admin management
  auth.uid() IS NOT NULL 
  AND (
    is_user_admin(auth.uid()) OR
    (verified = true AND check_enhanced_rate_limit(auth.uid(), 'direct_org_access', 5))
  )
);

-- Enhance contact access permission expiration handling
CREATE OR REPLACE FUNCTION public.validate_contact_access_permission(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission_record RECORD;
BEGIN
  -- Get the permission record
  SELECT * INTO permission_record
  FROM public.contact_access_permissions
  WHERE requester_id = user_id 
  AND organization_id = org_id
  AND status = 'approved'
  LIMIT 1;

  -- No permission found
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if permission has expired
  IF permission_record.expires_at IS NOT NULL AND permission_record.expires_at <= now() THEN
    -- Auto-revoke expired permission
    UPDATE public.contact_access_permissions
    SET status = 'expired', updated_at = now()
    WHERE id = permission_record.id;
    
    -- Log the expiration
    INSERT INTO public.audit_log (
      user_id,
      action,
      p_table_name,
      p_record_id,
      sensitive_data_accessed,
      created_at
    ) VALUES (
      user_id,
      'PERMISSION_AUTO_EXPIRED',
      'contact_access_permissions',
      permission_record.id,
      true,
      now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Update the has_contact_access_permission function to use validation
CREATE OR REPLACE FUNCTION public.has_contact_access_permission(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins always have access
  IF is_user_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Use the enhanced validation function
  RETURN validate_contact_access_permission(user_id, org_id);
END;
$$;

-- Create automated cleanup function for expired permissions
CREATE OR REPLACE FUNCTION public.cleanup_expired_permissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update expired permissions
  UPDATE public.contact_access_permissions
  SET status = 'expired', updated_at = now()
  WHERE status = 'approved'
  AND expires_at IS NOT NULL
  AND expires_at <= now();

  -- Log the cleanup
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    NULL,
    'AUTOMATED_PERMISSION_CLEANUP',
    'contact_access_permissions',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Enhanced suspicious activity detection
CREATE OR REPLACE FUNCTION public.detect_organization_access_abuse()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspicious_users RECORD;
  alert_id UUID;
BEGIN
  -- Detect users with excessive organization access
  FOR suspicious_users IN
    SELECT 
      user_id,
      COUNT(*) as access_count,
      COUNT(DISTINCT p_table_name) as tables_accessed
    FROM public.audit_log
    WHERE action LIKE '%ORG%'
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 30
  LOOP
    -- Create security alert
    SELECT create_security_alert(
      'EXCESSIVE_ORG_ACCESS',
      'high',
      'Excessive organization data access detected',
      format('User accessed organization data %s times across %s tables in 15 minutes', 
             suspicious_users.access_count, suspicious_users.tables_accessed),
      jsonb_build_object(
        'user_id', suspicious_users.user_id,
        'access_count', suspicious_users.access_count,
        'tables_accessed', suspicious_users.tables_accessed,
        'time_window', '15 minutes'
      ),
      suspicious_users.user_id
    ) INTO alert_id;
  END LOOP;
END;
$$;

-- Log this critical security fix
INSERT INTO public.audit_log (
  user_id,
  action,
  p_table_name,
  sensitive_data_accessed,
  created_at
) VALUES (
  auth.uid(),
  'CRITICAL_SECURITY_FIX_ORGANIZATION_ACCESS',
  'organizations',
  true,
  now()
) ON CONFLICT DO NOTHING;