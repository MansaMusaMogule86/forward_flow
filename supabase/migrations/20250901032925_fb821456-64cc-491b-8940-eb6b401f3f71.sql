-- Fix the Function Search Path Mutable security warnings
-- Set explicit search_path on all functions to prevent SQL injection attacks

-- Fix mask_contact_text function
CREATE OR REPLACE FUNCTION public.mask_contact_text(contact_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    -- Return masked version for non-admin users
    IF contact_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Simple masking - show first 3 chars and last 2 chars with asterisks in between
    IF LENGTH(contact_text) > 5 THEN
        RETURN LEFT(contact_text, 3) || '***' || RIGHT(contact_text, 2);
    ELSE
        RETURN '***';
    END IF;
END;
$$;

-- Fix log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
    table_name text,
    action text,
    record_id uuid DEFAULT NULL,
    sensitive_data_accessed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        p_table_name,
        action,
        p_record_id,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        auth.uid(),
        p_table_name,
        p_action,
        p_record_id,
        p_sensitive_data,
        now()
    ) ON CONFLICT DO NOTHING;
END;
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id uuid DEFAULT auth.uid(),
    table_name text DEFAULT 'organizations',
    p_limit_per_hour integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    request_count integer;
BEGIN
    -- Count requests in the last hour for this user/table combination
    SELECT COUNT(*) INTO request_count
    FROM public.audit_log
    WHERE user_id = p_user_id
    AND p_table_name = p_table_name
    AND created_at > (now() - interval '1 hour');
    
    -- Return false if limit exceeded
    RETURN request_count < p_limit_per_hour;
END;
$$;