-- Critical Security Fix #1: Remove public access to sensitive contact information
-- Drop the current policy that allows unauthenticated access to contact details
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

-- Critical Security Fix #2: Add missing search_path security to database functions
CREATE OR REPLACE FUNCTION public.log_profile_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT COUNT(*) INTO suspicious_count
  FROM public.audit_log
  WHERE audit_log.user_id = detect_suspicious_activity.user_id
    AND sensitive_data_accessed = true
    AND created_at > NOW() - INTERVAL '5 minutes';
  
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

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF LENGTH(password) < 8 THEN
    RETURN false;
  END IF;
  
  IF NOT (password ~ '[A-Z]') THEN
    RETURN false;
  END IF;
  
  IF NOT (password ~ '[0-9]') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;