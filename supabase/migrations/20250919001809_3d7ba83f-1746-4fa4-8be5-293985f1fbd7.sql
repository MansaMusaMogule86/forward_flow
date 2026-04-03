-- Implement stricter business justification and approval workflow for organization contact access
-- This addresses the security finding about admin functions having insufficient access controls

-- Create table for contact access justifications and approvals
CREATE TABLE IF NOT EXISTS public.contact_access_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  business_justification text NOT NULL,
  access_purpose text NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on justifications table
ALTER TABLE public.contact_access_justifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for justifications
DROP POLICY IF EXISTS "Admins can view contact justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can view contact justifications" ON public.contact_access_justifications
FOR SELECT
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create contact justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can create contact justifications" ON public.contact_access_justifications
FOR INSERT
WITH CHECK (
  is_user_admin(auth.uid()) 
  AND admin_user_id = auth.uid()
  AND check_enhanced_rate_limit(auth.uid(), 'justification_request', 3)
);

DROP POLICY IF EXISTS "Senior admins can approve justifications" ON public.contact_access_justifications; CREATE POLICY "Senior admins can approve justifications" ON public.contact_access_justifications
FOR UPDATE
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

-- CREATE OR REPLACE FUNCTION to request contact access with business justification
CREATE OR REPLACE FUNCTION public.request_admin_contact_access(
  p_organization_id uuid,
  p_business_justification text,
  p_access_purpose text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  justification_id uuid;
  recent_requests integer;
BEGIN
  -- Verify admin status
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Check for excessive requests
  SELECT COUNT(*) INTO recent_requests
  FROM public.contact_access_justifications
  WHERE admin_user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_requests >= 5 THEN
    RAISE EXCEPTION 'Too many access requests in the last hour. Limit: 5 per hour.';
  END IF;

  -- Validate inputs
  IF LENGTH(TRIM(p_business_justification)) < 20 THEN
    RAISE EXCEPTION 'Business justification must be at least 20 characters';
  END IF;

  IF LENGTH(TRIM(p_access_purpose)) < 10 THEN
    RAISE EXCEPTION 'Access purpose must be at least 10 characters';
  END IF;

  -- Create justification record
  INSERT INTO public.contact_access_justifications (
    admin_user_id,
    organization_id,
    business_justification,
    access_purpose
  ) VALUES (
    auth.uid(),
    p_organization_id,
    p_business_justification,
    p_access_purpose
  ) RETURNING id INTO justification_id ON CONFLICT DO NOTHING;

  -- Log the request
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'ADMIN_CONTACT_ACCESS_REQUESTED',
    'contact_access_justifications',
    justification_id,
    true,
    now()
  ) ON CONFLICT DO NOTHING;

  RETURN justification_id;
END;
$$;

-- CREATE OR REPLACE FUNCTION to approve/deny access requests
CREATE OR REPLACE FUNCTION public.approve_admin_contact_access(
  p_justification_id uuid,
  p_decision text, -- 'approved' or 'denied'
  p_hours_valid integer DEFAULT 24
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  justification_record RECORD;
BEGIN
  -- Verify admin status
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Validate decision
  IF p_decision NOT IN ('approved', 'denied') THEN
    RAISE EXCEPTION 'Decision must be approved or denied';
  END IF;

  -- Get justification record
  SELECT * INTO justification_record
  FROM public.contact_access_justifications
  WHERE id = p_justification_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Justification request not found';
  END IF;

  -- Prevent self-approval
  IF justification_record.admin_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot approve your own access request';
  END IF;

  -- Update the justification
  UPDATE public.contact_access_justifications
  SET 
    status = p_decision,
    approved_by = auth.uid(),
    approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
    expires_at = CASE 
      WHEN p_decision = 'approved' THEN now() + (p_hours_valid || ' hours')::INTERVAL 
      ELSE expires_at 
    END,
    updated_at = now()
  WHERE id = p_justification_id;

  -- Log the decision
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'ADMIN_CONTACT_ACCESS_' || upper(p_decision),
    'contact_access_justifications',
    p_justification_id,
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- CREATE OR REPLACE FUNCTION to check if admin has approved access to organization
CREATE OR REPLACE FUNCTION public.has_approved_admin_access(
  p_admin_user_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_access boolean := false;
BEGIN
  -- Check for valid, non-expired approval
  SELECT EXISTS(
    SELECT 1
    FROM public.contact_access_justifications
    WHERE admin_user_id = p_admin_user_id
    AND organization_id = p_organization_id
    AND status = 'approved'
    AND expires_at > now()
  ) INTO valid_access;

  RETURN valid_access;
END;
$$;

-- Update the admin contact reveal function to require approved justification
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
  -- Verify admin status
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- NEW: Require approved justification for contact access
  IF NOT has_approved_admin_access(auth.uid(), org_id) THEN
    RAISE EXCEPTION 'Approved business justification required for contact access. Please submit an access request first.';
  END IF;

  -- Enhanced rate limiting for contact reveals
  IF NOT check_enhanced_rate_limit(auth.uid(), 'contact_reveal', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded for contact reveals';
  END IF;

  -- Get contact information
  SELECT email, phone, address 
  INTO contact_email, contact_phone, contact_address
  FROM public.organizations 
  WHERE id = org_id AND verified = true;

  -- Log the access with enhanced details
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
    'ADMIN_CONTACT_REVEAL_WITH_JUSTIFICATION',
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

-- Update the secure organizations function to require justification for admin access
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
    created_at
  ) VALUES (
    auth.uid(),
    'SECURE_ORG_ACCESS',
    'organizations',
    true,
    now()
  ) ON CONFLICT DO NOTHING;

  -- Return data with enhanced access control for admins
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
      -- Admins now need approved justification for each organization's contact data
      WHEN is_user_admin(auth.uid()) AND has_approved_admin_access(auth.uid(), o.id) THEN o.email
      WHEN has_contact_access_permission(auth.uid(), o.id) THEN o.email
      ELSE mask_contact_text(o.email)
    END as email,
    CASE 
      WHEN is_user_admin(auth.uid()) AND has_approved_admin_access(auth.uid(), o.id) THEN o.phone
      WHEN has_contact_access_permission(auth.uid(), o.id) THEN o.phone
      ELSE mask_contact_text(o.phone)
    END as phone,
    CASE 
      WHEN is_user_admin(auth.uid()) AND has_approved_admin_access(auth.uid(), o.id) THEN o.address
      WHEN has_contact_access_permission(auth.uid(), o.id) THEN o.address
      ELSE 'Contact access requires justification'::text
    END as address,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.verified = true;
END;
$$;

-- Create automated cleanup for expired justifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_justifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired justifications
  UPDATE public.contact_access_justifications
  SET status = 'expired', updated_at = now()
  WHERE status = 'approved'
  AND expires_at <= now();

  -- Log cleanup
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    NULL,
    'AUTOMATED_JUSTIFICATION_CLEANUP',
    'contact_access_justifications',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Add trigger to automatically update timestamps
DROP TRIGGER IF EXISTS update_justifications_updated_at ON public.contact_access_justifications; CREATE TRIGGER update_justifications_updated_at BEFORE UPDATE ON public.contact_access_justifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log this enhanced security implementation
INSERT INTO public.audit_log (
  user_id,
  action,
  p_table_name,
  sensitive_data_accessed,
  created_at
) VALUES (
  auth.uid(),
  'ENHANCED_ADMIN_ACCESS_CONTROLS_IMPLEMENTED',
  'organizations',
  true,
  now()
) ON CONFLICT DO NOTHING;