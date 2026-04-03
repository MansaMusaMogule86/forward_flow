-- CRITICAL SECURITY FIX: Remove dangerous users table with plaintext passwords
-- This table is redundant since Supabase handles authentication through auth.users
-- Keeping it creates unnecessary security risks with plaintext password storage

-- Drop the custom users table entirely (this will also drop dependent views)
DROP TABLE IF EXISTS public.users CASCADE;

-- Verify profiles table has proper constraints and security
-- The profiles table is the correct way to store additional user data
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_user_id_not_null CHECK (user_id IS NOT NULL);

-- Add additional security logging for profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS profile_access_audit ON public.profiles;
CREATE TRIGGER profile_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_access();

-- Payment data security enhancement
-- Add encryption support for payment amounts (using pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enhanced payment logging function
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment access logging (only for DML p_actions)
DROP TRIGGER IF EXISTS payment_access_audit ON public.payments;
CREATE TRIGGER payment_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_access();

-- Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREATE OR REPLACE FUNCTION to clean up old audit logs (data retention)
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;