-- Phase 2: Edge Function Security - Add JWT verification for sensitive functions
-- Update config.toml to enable JWT verification for admin/sensitive functions

-- Create additional security function for contact reveal with enhanced logging
CREATE OR REPLACE FUNCTION public.admin_reveal_full_contact(org_id uuid)
RETURNS TABLE(email text, phone text, address text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Enhanced payment security
CREATE OR REPLACE FUNCTION public.secure_payment_access()
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Require authentication for payment access
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for payment access';
  END IF;

  -- Enhanced rate limiting for payment data access
  IF NOT check_enhanced_rate_limit(auth.uid(), 'payment_access', 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded for payment access';
  END IF;

  -- Log payment data access
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'PAYMENT_DATA_ACCESS',
    'payments',
    true,
    now()
  ) ON CONFLICT DO NOTHING;

  -- Return user's own payment data only
  RETURN QUERY 
  SELECT * FROM public.payments 
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$$;