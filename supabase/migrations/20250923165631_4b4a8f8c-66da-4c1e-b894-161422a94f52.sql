-- Fix the failed function from previous migration
-- Removed DROP FUNCTION to avoid dependency issues: public.mask_contact_text(text);

CREATE OR REPLACE FUNCTION public.mask_contact_text(contact_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF contact_value IS NULL OR LENGTH(contact_value) = 0 THEN
    RETURN 'Not available';
  END IF;
  
  -- Mask email addresses
  IF contact_value LIKE '%@%' THEN
    RETURN LEFT(contact_value, 2) || '***@***' || RIGHT(contact_value, 4);
  END IF;
  
  -- Mask phone numbers
  IF contact_value ~ '^[\+\d\s\-\(\)\.]+$' THEN
    RETURN '***-***-' || RIGHT(regexp_replace(contact_value, '[^\d]', '', 'g'), 4);
  END IF;
  
  -- Default masking for other contact types
  RETURN LEFT(contact_value, 2) || '***' || RIGHT(contact_value, 2);
END;
$$;

-- Add missing enhanced rate limit check function for admin p_actions
CREATE OR REPLACE FUNCTION public.check_admin_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_p_actions_count integer;
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Count admin p_actions in last hour
  SELECT COUNT(*) INTO admin_p_actions_count
  FROM public.audit_log
  WHERE user_id = auth.uid()
  AND sensitive_data_accessed = true
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow up to 100 admin p_actions per hour
  RETURN admin_p_actions_count < 100;
END;
$$;