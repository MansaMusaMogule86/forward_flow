-- PHASE 1: DATA ACCESS AUDIT & STRENGTHENING
-- Fix critical data exposure vulnerabilities

-- 1. Create secure public view for organizations that excludes sensitive contact info
DROP VIEW IF EXISTS public.organizations_public;

CREATE VIEW public.organizations_public 
WITH (security_invoker = true) AS
SELECT 
    id,
    name,
    description,
    website,
    city,
    state_code,
    verified,
    created_at,
    updated_at
    -- Explicitly EXCLUDE: email, phone, address (sensitive contact info)
FROM public.organizations
WHERE verified = true;

-- Grant limited permissions to public view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

-- 2. Add explicit DENY policies for sensitive contact information access
-- Ensure that even if main RLS policies fail, sensitive data is protected

-- Policy to prevent public access to sensitive organization contact info
DROP POLICY IF EXISTS "Deny public access to sensitive org contact info" ON public.organizations; CREATE POLICY "Deny public access to sensitive org contact info" ON public.organizations 
FOR SELECT 
TO anon
USING (false); -- Explicit deny for anonymous users

-- 3. Create data masking function for contact information
CREATE OR REPLACE FUNCTION public.mask_contact_text(contact_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
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

-- 4. Add database constraints to prevent accidental public exposure
-- Add check constraint to ensure verified organizations have required fields
ALTER TABLE public.organizations 
ADD CONSTRAINT verified_orgs_have_name 
CHECK (verified = false OR (verified = true AND name IS NOT NULL AND LENGTH(name) > 0));

-- 5. Create audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    table_name text NOT NULL,
    action text NOT NULL,
    record_id uuid,
    sensitive_data_accessed boolean DEFAULT false,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_log; CREATE POLICY "Only admins can view audit logs" ON public.audit_log 
FOR SELECT 
USING (is_user_admin());

-- CREATE OR REPLACE FUNCTION to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
    table_name text,
    action text,
    record_id uuid DEFAULT NULL,
    sensitive_data_accessed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 6. Strengthen partner_referrals and partnership_requests security
-- Add explicit policies to ensure only admins can access sensitive contact info

-- Enhanced policy for partner referrals - more restrictive
DROP POLICY IF EXISTS "Only admins can view partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Admins only can view partner referrals with logging" ON public.partner_referrals; CREATE POLICY "Admins only can view partner referrals with logging" ON public.partner_referrals 
FOR SELECT 
USING (
    is_user_admin() AND 
    (SELECT public.log_sensitive_access('partner_referrals', 'SELECT', id, true)) IS NULL
);

-- Enhanced policy for partnership requests - more restrictive  
DROP POLICY IF EXISTS "Admins can view all partnership requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Admins only can view partnership requests with logging" ON public.partnership_requests; CREATE POLICY "Admins only can view partnership requests with logging" ON public.partnership_requests 
FOR SELECT 
USING (
    is_user_admin() AND 
    (SELECT public.log_sensitive_access('partnership_requests', 'SELECT', id, true)) IS NULL
);

-- 7. Create rate limiting function to prevent bulk scraping
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id uuid DEFAULT auth.uid(),
    table_name text DEFAULT 'organizations',
    p_limit_per_hour integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.mask_contact_text(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sensitive_access(text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) TO authenticated;