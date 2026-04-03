-- Emergency fix for "Geographic Data Exposed to Anonymous Users" 
-- Remove anonymous access to sensitive business expansion data

-- Drop the permissive anonymous policy that exposes business strategy
DROP POLICY IF EXISTS "Anyone can view states" ON public.states;

-- Add authentication-required policy to protect business intelligence
DROP POLICY IF EXISTS "Authenticated users can view states" ON public.states; CREATE POLICY "Authenticated users can view states" ON public.states 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Enhanced business strategy protection measures

-- CREATE OR REPLACE FUNCTION to add strategic data obfuscation for non-admins
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

-- Enhanced scraping detection function 
CREATE OR REPLACE FUNCTION public.detect_data_scraping(p_table_name_param text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_val UUID := auth.uid();
  request_count INTEGER;
BEGIN
  -- Skip if no user (already blocked by RLS)
  IF user_id_val IS NULL THEN
    RETURN;
  END IF;
  
  -- Count rapid requests from same user in last 2 minutes
  SELECT COUNT(*) INTO request_count
  FROM public.audit_log
  WHERE user_id = user_id_val
  AND p_table_name = p_table_name_param
  AND created_at > NOW() - INTERVAL '2 minutes';
  
  -- Create alert if suspicious pattern detected
  IF request_count > 30 THEN
    PERFORM create_security_alert(
      'POTENTIAL_DATA_SCRAPING',
      'high',
      'Rapid data access detected - potential scraping attempt',
      format('User made %s requests to %s table in 2 minutes', request_count, p_table_name_param),
      jsonb_build_object(
        'user_id', user_id_val,
        'p_table_name', p_table_name_param,
        'request_count', request_count,
        'time_window', '2 minutes'
      ),
      user_id_val
    );
  END IF;
END;
$$;