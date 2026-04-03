-- Additional security measures for contact data protection
-- CREATE OR REPLACE FUNCTION to add additional verification for admin contact access
CREATE OR REPLACE FUNCTION public.verify_admin_contact_access(admin_user_id uuid, p_action_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    recent_access_count integer;
    user_role text;
BEGIN
    -- Verify user is actually an admin
    IF NOT is_user_admin(admin_user_id) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Check for excessive access in last hour
    SELECT COUNT(*) INTO recent_access_count
    FROM public.audit_log
    WHERE user_id = admin_user_id
    AND sensitive_data_accessed = true
    AND action LIKE '%CONTACT%'
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Block if more than 50 contact accesses per hour
    IF recent_access_count > 50 THEN
        -- Create security alert
        PERFORM create_security_alert(
            'EXCESSIVE_ADMIN_CONTACT_ACCESS',
            'high',
            'Admin exceeded contact access limits',
            format('Admin user accessed contact data %s times in one hour', recent_access_count),
            jsonb_build_object('admin_user_id', admin_user_id, 'access_count', recent_access_count),
            admin_user_id
        );
        RAISE EXCEPTION 'Access temporarily blocked due to excessive usage';
    END IF;
    
    -- Log the verification
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        admin_user_id,
        'ADMIN_CONTACT_VERIFICATION_' || upper(p_action_type),
        'security_verification',
        true,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN true;
END;
$function$;

-- Update admin contact reveal function with additional security
CREATE OR REPLACE FUNCTION public.admin_reveal_full_contact(org_id uuid)
 RETURNS TABLE(email text, phone text, address text)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  contact_email text;
  contact_phone text;  
  contact_address text;
BEGIN
  -- Additional verification step
  PERFORM verify_admin_contact_access(auth.uid(), 'full_reveal');

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
    'ADMIN_FULL_CONTACT_REVEAL_VERIFIED',
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
$function$;

-- Add data retention policy for sensitive referral data
CREATE OR REPLACE FUNCTION public.cleanup_expired_referral_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Archive referrals older than 2 years and mark as archived instead of deleting
  UPDATE public.partner_referrals
  SET 
    contact_text = 'ARCHIVED - Data retention policy applied',
    notes = COALESCE(notes, '') || ' [ARCHIVED - ' || now()::date || ']',
    status = 'archived'
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND status != 'archived';
    
  -- Log the cleanup p_action
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    NULL,
    'AUTOMATED_DATA_CLEANUP',
    'partner_referrals',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$function$;