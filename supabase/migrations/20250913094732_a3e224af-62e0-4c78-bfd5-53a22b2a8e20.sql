-- Add missing RLS policies and functions for security monitoring

-- Create policies for AI usage analytics (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_usage_analytics' 
        AND policyname = 'Admins can view all AI usage analytics'
    ) THEN
        DROP POLICY IF EXISTS "Admins can view all AI usage analytics" ON public.ai_usage_analytics; CREATE POLICY "Admins can view all AI usage analytics" ON public.ai_usage_analytics
        FOR SELECT
        USING (is_user_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_usage_analytics' 
        AND policyname = 'System can insert AI usage analytics'
    ) THEN
        DROP POLICY IF EXISTS "System can insert AI usage analytics" ON public.ai_usage_analytics; CREATE POLICY "System can insert AI usage analytics" ON public.ai_usage_analytics
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- Create policies for security alerts (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_alerts' 
        AND policyname = 'Admins can view all security alerts'
    ) THEN
        DROP POLICY IF EXISTS "Admins can view all security alerts" ON public.security_alerts; CREATE POLICY "Admins can view all security alerts" ON public.security_alerts
        FOR SELECT
        USING (is_user_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_alerts' 
        AND policyname = 'Admins can update security alerts'
    ) THEN
        DROP POLICY IF EXISTS "Admins can update security alerts" ON public.security_alerts; CREATE POLICY "Admins can update security alerts" ON public.security_alerts
        FOR UPDATE
        USING (is_user_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_alerts' 
        AND policyname = 'System can insert security alerts'
    ) THEN
        DROP POLICY IF EXISTS "System can insert security alerts" ON public.security_alerts; CREATE POLICY "System can insert security alerts" ON public.security_alerts
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- Create policies for system metrics (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_metrics' 
        AND policyname = 'Admins can view all system metrics'
    ) THEN
        DROP POLICY IF EXISTS "Admins can view all system metrics" ON public.system_metrics; CREATE POLICY "Admins can view all system metrics" ON public.system_metrics
        FOR SELECT
        USING (is_user_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_metrics' 
        AND policyname = 'System can insert system metrics'
    ) THEN
        DROP POLICY IF EXISTS "System can insert system metrics" ON public.system_metrics; CREATE POLICY "System can insert system metrics" ON public.system_metrics
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- Function to log AI endpoint usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
    p_endpoint_name TEXT,
    p_user_id UUID DEFAULT NULL,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_error_count INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.ai_usage_analytics (
        endpoint_name,
        user_id,
        ip_address,
        user_agent,
        response_time_ms,
        error_count
    ) VALUES (
        p_endpoint_name,
        p_user_id,
        inet_client_addr(),
        current_setting('request.header.user-agent', true),
        p_response_time_ms,
        p_error_count
    ) ON CONFLICT DO NOTHING;
END;
$function$;

-- Function to create security alerts
CREATE OR REPLACE FUNCTION public.create_security_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO public.security_alerts (
        alert_type,
        severity,
        title,
        description,
        metadata,
        user_id,
        ip_address
    ) VALUES (
        p_alert_type,
        p_severity,
        p_title,
        p_description,
        p_metadata,
        p_user_id,
        inet_client_addr()
    ) RETURNING id INTO alert_id ON CONFLICT DO NOTHING;
    
    RETURN alert_id;
END;
$function$;

-- Function to get security metrics summary
CREATE OR REPLACE FUNCTION public.get_security_metrics_summary()
RETURNS TABLE(
    total_alerts INTEGER,
    critical_alerts INTEGER,
    high_alerts INTEGER,
    unresolved_alerts INTEGER,
    ai_requests_24h INTEGER,
    unique_users_24h INTEGER,
    avg_response_time_ms NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Require admin privileges
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.security_alerts) as total_alerts,
        (SELECT COUNT(*)::INTEGER FROM public.security_alerts WHERE severity = 'critical') as critical_alerts,
        (SELECT COUNT(*)::INTEGER FROM public.security_alerts WHERE severity = 'high') as high_alerts,
        (SELECT COUNT(*)::INTEGER FROM public.security_alerts WHERE resolved = false) as unresolved_alerts,
        (SELECT COUNT(*)::INTEGER FROM public.ai_usage_analytics WHERE created_at > NOW() - INTERVAL '24 hours') as ai_requests_24h,
        (SELECT COUNT(DISTINCT user_id)::INTEGER FROM public.ai_usage_analytics WHERE created_at > NOW() - INTERVAL '24 hours') as unique_users_24h,
        (SELECT COALESCE(AVG(response_time_ms), 0) FROM public.ai_usage_analytics WHERE created_at > NOW() - INTERVAL '24 hours' AND response_time_ms IS NOT NULL) as avg_response_time_ms;
END;
$function$;

-- Function to resolve security alerts
CREATE OR REPLACE FUNCTION public.resolve_security_alert(p_alert_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Require admin privileges
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;
    
    UPDATE public.security_alerts
    SET 
        resolved = true,
        resolved_at = now(),
        resolved_by = auth.uid()
    WHERE id = p_alert_id;
END;
$function$;

-- Enhanced suspicious activity detection function
CREATE OR REPLACE FUNCTION public.detect_advanced_suspicious_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    suspicious_users RECORD;
    alert_id UUID;
BEGIN
    -- Detect users with excessive contact access in short time
    FOR suspicious_users IN
        SELECT 
            user_id,
            COUNT(*) as access_count,
            MIN(created_at) as first_access,
            MAX(created_at) as last_access
        FROM public.audit_log
        WHERE sensitive_data_accessed = true
        AND action LIKE '%CONTACT%'
        AND created_at > NOW() - INTERVAL '10 minutes'
        GROUP BY user_id
        HAVING COUNT(*) > 20
    LOOP
        -- Create high severity alert
        SELECT create_security_alert(
            'EXCESSIVE_CONTACT_ACCESS',
            'high',
            'Excessive contact data access detected',
            format('User accessed contact data %s times in 10 minutes', suspicious_users.access_count),
            jsonb_build_object(
                'user_id', suspicious_users.user_id,
                'access_count', suspicious_users.access_count,
                'time_window', '10 minutes'
            ),
            suspicious_users.user_id
        ) INTO alert_id;
    END LOOP;
    
    -- Detect rapid AI endpoint usage (potential abuse)
    FOR suspicious_users IN
        SELECT 
            COALESCE(user_id, ip_address::text) as identifier,
            endpoint_name,
            COUNT(*) as request_count,
            SUM(error_count) as total_errors
        FROM public.ai_usage_analytics
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY COALESCE(user_id, ip_address::text), endpoint_name
        HAVING COUNT(*) > 100 OR SUM(error_count) > 10
    LOOP
        -- Create medium severity alert for AI abuse
        SELECT create_security_alert(
            'AI_ENDPOINT_ABUSE',
            'medium',
            'Potential AI endpoint abuse detected',
            format('Excessive requests to %s endpoint: %s requests, %s errors', 
                   suspicious_users.endpoint_name, 
                   suspicious_users.request_count,
                   suspicious_users.total_errors),
            jsonb_build_object(
                'identifier', suspicious_users.identifier,
                'endpoint', suspicious_users.endpoint_name,
                'request_count', suspicious_users.request_count,
                'error_count', suspicious_users.total_errors
            )
        ) INTO alert_id;
    END LOOP;
END;
$function$;