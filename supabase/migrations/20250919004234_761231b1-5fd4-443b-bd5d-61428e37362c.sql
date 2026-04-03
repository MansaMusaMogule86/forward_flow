-- Emergency fix for "Geographic Data Exposed to Anonymous Users" 
-- Remove anonymous access to sensitive business expansion data

-- Drop the permissive anonymous policy that exposes business strategy
DROP POLICY IF EXISTS "Anyone can view states" ON public.states;

-- Add authentication-required policy to protect business intelligence
DROP POLICY IF EXISTS "Authenticated users can view states" ON public.states; CREATE POLICY "Authenticated users can view states" ON public.states 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Enhanced business strategy protection measures

-- CREATE OR REPLACE FUNCTION to detect and block scraping attempts
CREATE OR REPLACE FUNCTION public.detect_scraping_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  user_id_val UUID := auth.uid();
BEGIN
  -- Count rapid requests from same user in last 2 minutes
  SELECT COUNT(*) INTO request_count
  FROM public.audit_log
  WHERE user_id = user_id_val
  AND p_table_name = TG_p_table_name
  AND action = 'SELECT'
  AND created_at > NOW() - INTERVAL '2 minutes';
  
  -- Block if more than 50 requests in 2 minutes (potential scraping)
  IF request_count > 50 THEN
    -- Create security alert for potential scraping
    PERFORM create_security_alert(
      'POTENTIAL_DATA_SCRAPING',
      'high',
      'Rapid data access detected - potential scraping attempt',
      format('User made %s requests to %s table in 2 minutes', request_count, TG_p_table_name),
      jsonb_build_object(
        'user_id', user_id_val,
        'p_table_name', TG_p_table_name,
        'request_count', request_count,
        'time_window', '2 minutes'
      ),
      user_id_val
    );
    
    RAISE EXCEPTION 'Access temporarily blocked due to suspicious activity pattern';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add scraping detection trigger to states table
DROP TRIGGER IF EXISTS detect_states_scraping ON public.states;
CREATE TRIGGER detect_states_scraping
  BEFORE SELECT ON public.states
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.detect_scraping_activity();

-- CREATE OR REPLACE FUNCTION to add strategic data obfuscation
CREATE OR REPLACE FUNCTION public.get_states_with_protection()
RETURNS TABLE(
  id uuid,
  code text, 
  name text,
  active boolean,
  coming_soon boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_val UUID := auth.uid();
  is_admin_user BOOLEAN;
BEGIN
  -- Require authentication
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Authentication required for state data access';
  END IF;
  
  -- Check if user is admin
  SELECT is_user_admin(user_id_val) INTO is_admin_user;
  
  -- Enhanced rate limiting for state data
  IF NOT check_enhanced_rate_limit(user_id_val, 'state_data_access', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded for state data access';
  END IF;
  
  -- Log access for audit trail
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    user_id_val,
    'PROTECTED_STATE_ACCESS',
    'states',
    true,
    now()
  ) ON CONFLICT DO NOTHING;
  
  -- Return data with strategic obfuscation for non-admins
  RETURN QUERY
  SELECT 
    s.id,
    s.code,
    s.name,
    CASE 
      WHEN is_admin_user THEN s.active
      ELSE false  -- Hide true expansion status from non-admins
    END as active,
    CASE 
      WHEN is_admin_user THEN s.coming_soon
      ELSE false  -- Hide expansion plans from competitors
    END as coming_soon,
    s.created_at
  FROM public.states s;
END;
$$;

-- Create IP-based rate limiting for additional protection
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_address INET := inet_client_addr();
  request_count INTEGER;
BEGIN
  -- Count requests from same IP in last hour
  SELECT COUNT(*) INTO request_count
  FROM public.audit_log
  WHERE ip_address = check_ip_rate_limit.ip_address
  AND sensitive_data_accessed = true
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Block IPs with excessive requests (potential scraping bots)
  IF request_count > 100 THEN
    -- Log the blocked IP
    PERFORM create_security_alert(
      'IP_RATE_LIMIT_EXCEEDED',
      'medium',
      'IP address exceeded rate limits',
      format('IP %s made %s sensitive data requests in 1 hour', ip_address, request_count),
      jsonb_build_object(
        'ip_address', ip_address,
        'request_count', request_count
      )
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add comprehensive audit logging for all state data access
CREATE OR REPLACE FUNCTION public.audit_state_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all state data access with detailed forensics
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
    TG_OP || '_STATE_DATA',
    'states',
    COALESCE(NEW.id, OLD.id),
    true,  -- State data is considered sensitive business intelligence
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit trigger to states table
DROP TRIGGER IF EXISTS audit_state_data_access ON public.states;
CREATE TRIGGER audit_state_data_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.states
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_state_access();