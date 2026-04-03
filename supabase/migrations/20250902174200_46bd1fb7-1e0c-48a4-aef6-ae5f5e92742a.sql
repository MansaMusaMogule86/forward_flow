-- CRITICAL SECURITY FIXES
-- Phase 1: Database Security Hardening

-- 1. Add explicit DENY policy for organizations to prevent unauthorized access
DROP POLICY IF EXISTS "orgs_deny_unauthenticated" ON public.organizations;
DROP POLICY IF EXISTS "orgs_deny_unauthenticated" ON public.organizations; CREATE POLICY "orgs_deny_unauthenticated" ON public.organizations 
FOR ALL 
TO anon 
USING (false);

-- 2. Strengthen existing organizations policy with explicit authentication check
DROP POLICY IF EXISTS "orgs_read_own" ON public.organizations;
DROP POLICY IF EXISTS "orgs_read_authenticated_own" ON public.organizations; CREATE POLICY "orgs_read_authenticated_own" ON public.organizations FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND is_user_admin());

-- 3. Add explicit DENY policy for profiles to prevent enumeration
DROP POLICY IF EXISTS "profiles_deny_unauthenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_deny_unauthenticated" ON public.profiles; CREATE POLICY "profiles_deny_unauthenticated" ON public.profiles 
FOR ALL 
TO anon 
USING (false);

-- 4. Strengthen profiles policies with explicit authentication checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "profiles_authenticated_select_own" ON public.profiles; CREATE POLICY "profiles_authenticated_select_own" ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_authenticated_update_own" ON public.profiles; CREATE POLICY "profiles_authenticated_update_own" ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_authenticated_insert_own" ON public.profiles; CREATE POLICY "profiles_authenticated_insert_own" ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5. Add explicit DENY policies for sensitive admin tables
DROP POLICY IF EXISTS "referrals_deny_unauthenticated" ON public.partner_referrals;
DROP POLICY IF EXISTS "referrals_deny_unauthenticated" ON public.partner_referrals; CREATE POLICY "referrals_deny_unauthenticated" ON public.partner_referrals 
FOR ALL 
TO anon 
USING (false);

DROP POLICY IF EXISTS "partnerships_deny_unauthenticated" ON public.partnership_requests;
DROP POLICY IF EXISTS "partnerships_deny_unauthenticated" ON public.partnership_requests; CREATE POLICY "partnerships_deny_unauthenticated" ON public.partnership_requests 
FOR ALL 
TO anon 
USING (false);

-- 6. Strengthen user_roles with explicit DENY for anon
DROP POLICY IF EXISTS "roles_deny_unauthenticated" ON public.user_roles;
DROP POLICY IF EXISTS "roles_deny_unauthenticated" ON public.user_roles; CREATE POLICY "roles_deny_unauthenticated" ON public.user_roles 
FOR ALL 
TO anon 
USING (false);

-- 7. Add rate limiting for sensitive p_actions
CREATE OR REPLACE FUNCTION public.check_admin_rate_limit(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    request_count integer;
BEGIN
    -- Check if user is authenticated
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Count admin requests in the last 5 minutes
    SELECT COUNT(*) INTO request_count
    FROM public.audit_log
    WHERE user_id = p_user_id
    AND p_table_name IN ('partner_referrals', 'partnership_requests')
    AND created_at > (now() - interval '5 minutes');
    
    -- Allow max 50 requests per 5 minutes for admin p_actions
    RETURN request_count < 50;
END;
$$;

-- 8. Update admin policies to include rate limiting
DROP POLICY IF EXISTS "Admins only can view partner referrals with logging" ON public.partner_referrals;
DROP POLICY IF EXISTS "referrals_admin_select_with_limits" ON public.partner_referrals; CREATE POLICY "referrals_admin_select_with_limits" ON public.partner_referrals 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() IS NOT NULL 
    AND is_user_admin() 
    AND check_admin_rate_limit()
    AND (SELECT log_sensitive_access('partner_referrals'::text, 'SELECT'::text, partner_referrals.id, true) IS NULL)
);

DROP POLICY IF EXISTS "Admins only can view partnership requests with logging" ON public.partnership_requests;
DROP POLICY IF EXISTS "partnerships_admin_select_with_limits" ON public.partnership_requests; CREATE POLICY "partnerships_admin_select_with_limits" ON public.partnership_requests 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() IS NOT NULL 
    AND is_user_admin() 
    AND check_admin_rate_limit()
    AND (SELECT log_sensitive_access('partnership_requests'::text, 'SELECT'::text, partnership_requests.id, true) IS NULL)
);

-- 9. Add data masking function for contact information
CREATE OR REPLACE FUNCTION public.get_masked_contact_text(contact_text text, user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return full contact info only for admins
    IF user_id IS NOT NULL AND is_user_admin() THEN
        RETURN contact_text;
    END IF;
    
    -- Return masked version for non-admin users
    RETURN mask_contact_text(contact_text);
END;
$$;

-- 10. Add enhanced audit logging trigger
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log all access to sensitive tables
    IF TG_p_table_name IN ('partner_referrals', 'partnership_requests', 'organizations') THEN
        INSERT INTO public.audit_log (
            user_id,
            p_table_name,
            action,
            p_record_id,
            sensitive_data_accessed,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            auth.uid(),
            TG_p_table_name,
            TG_OP,
            CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
            true,
            inet_client_addr(),
            current_setting('request.header.user-agent', true),
            now()
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 11. Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_partner_referrals ON public.partner_referrals;
CREATE TRIGGER audit_partner_referrals
    AFTER INSERT OR UPDATE OR DELETE ON public.partner_referrals
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_partnership_requests ON public.partnership_requests;
CREATE TRIGGER audit_partnership_requests
    AFTER INSERT OR UPDATE OR DELETE ON public.partnership_requests
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_organizations ON public.organizations;
CREATE TRIGGER audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();