-- Fix remaining functions that need proper search_path settings
-- These functions need to be updated to have proper SECURITY DEFINER search_path

CREATE OR REPLACE FUNCTION public.check_admin_p_action_limit(p_action_type text DEFAULT 'general'::text)
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

CREATE OR REPLACE FUNCTION public.check_admin_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    access_count integer;
BEGIN
    -- Check access count in last hour for current admin user
    SELECT COUNT(*) INTO access_count
    FROM audit_log
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour'
    AND sensitive_data_accessed = true;
    
    -- Allow max 50 sensitive data accesses per hour per admin
    RETURN access_count < 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(p_user_id uuid DEFAULT auth.uid(), p_operation text DEFAULT 'general'::text, p_limit_per_hour integer DEFAULT 50)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    request_count integer;
    is_admin boolean;
BEGIN
    -- Allow higher limits for admins
    SELECT is_user_admin(p_user_id) INTO is_admin;
    
    IF is_admin THEN
        p_limit_per_hour := p_limit_per_hour * 2; -- Double limit for admins
    END IF;
    
    -- Count requests in the last hour for this user/p_action combination
    SELECT COUNT(*) INTO request_count
    FROM public.audit_log
    WHERE user_id = p_user_id
    AND action LIKE '%' || p_operation || '%'
    AND created_at > (now() - interval '1 hour');
    
    -- Log the rate limit check
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        p_record_id,
        created_at
    ) VALUES (
        p_user_id,
        'RATE_LIMIT_CHECK_' || p_operation,
        'rate_limiting',
        null,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN request_count < p_limit_per_hour;
END;
$$;