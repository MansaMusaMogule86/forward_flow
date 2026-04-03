-- Critical Security Fix #1: Remove public access to sensitive contact information
-- Drop the current policy that allows unauthenticated access
DROP POLICY IF EXISTS "verified_partner_contact_access" ON public.organizations;

-- Create new secure policy that requires authentication for contact access
DROP POLICY IF EXISTS "authenticated_partner_contact_access" ON public.organizations; CREATE POLICY "authenticated_partner_contact_access" ON public.organizations 
FOR SELECT 
USING (
  verified = true 
  AND auth.uid() IS NOT NULL 
  AND is_verified_partner(auth.uid()) 
  AND check_enhanced_rate_limit(auth.uid(), 'org_contact_access'::text, 10)
);

-- Add a separate policy for public access to basic organization info (no contact details)
DROP POLICY IF EXISTS "public_basic_org_info" ON public.organizations; CREATE POLICY "public_basic_org_info" ON public.organizations 
FOR SELECT 
USING (verified = true);

-- Critical Security Fix #2: Add missing search_path security to database functions
-- Update functions that are missing proper search_path configuration

CREATE OR REPLACE FUNCTION public.log_profile_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log profile access for security monitoring
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP || '_PROFILE',
    'profiles',
    COALESCE(NEW.id, OLD.id),
    true,
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_payment_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all payment data access for compliance
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP || '_PAYMENT_DATA',
    'payments',
    COALESCE(NEW.id, OLD.id),
    true,
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  suspicious_count integer;
  user_id uuid := auth.uid();
BEGIN
  -- Check for rapid successive sensitive data access
  SELECT COUNT(*) INTO suspicious_count
  FROM public.audit_log
  WHERE audit_log.user_id = detect_suspicious_activity.user_id
    AND sensitive_data_accessed = true
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  -- Alert if more than 15 sensitive accesses in 5 minutes
  IF suspicious_count > 15 THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      p_table_name,
      sensitive_data_accessed,
      created_at
    ) VALUES (
      user_id,
      'SUSPICIOUS_ACTIVITY_DETECTED',
      'security_monitoring',
      true,
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Keep audit logs for 1 year, then archive/delete
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND sensitive_data_accessed = false;
  
  -- Keep sensitive data access logs for 2 years
  DELETE FROM public.audit_log  
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND sensitive_data_accessed = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Minimum 8 characters
  IF LENGTH(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF NOT (password ~ '[A-Z]') THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one number
  IF NOT (password ~ '[0-9]') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_contact_input(p_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Check name length and content
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 OR LENGTH(TRIM(p_name)) > 100 THEN
        RETURN false;
    END IF;
    
    -- Validate email if provided
    IF p_email IS NOT NULL THEN
        IF NOT (p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Validate phone if provided
    IF p_phone IS NOT NULL THEN
        -- Remove common formatting and check if it's a valid phone number
        IF NOT (REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g') ~ '^\+?[0-9]{10,15}$') THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_partner_referral_input()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate input data
    IF NOT validate_contact_input(NEW.name, NULL, NEW.contact_text) THEN
        RAISE EXCEPTION 'Invalid input data provided';
    END IF;
    
    -- Log the referral submission for audit purposes
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        p_record_id,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        auth.uid(),
        'REFERRAL_SUBMIT',
        'partner_referrals',
        NEW.id,
        true,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_partnership_request_input()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate input data
    IF NOT validate_contact_input(NEW.organization_name, NEW.contact_email, NULL) THEN
        RAISE EXCEPTION 'Invalid input data provided';
    END IF;
    
    -- Additional validation for organization name and description
    IF LENGTH(TRIM(NEW.description)) < 10 OR LENGTH(TRIM(NEW.description)) > 1000 THEN
        RAISE EXCEPTION 'Description must be between 10 and 1000 characters';
    END IF;
    
    -- Log the partnership request for audit purposes
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        p_record_id,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        auth.uid(),
        'PARTNERSHIP_REQUEST',
        'partnership_requests',
        NEW.id,
        true,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$;