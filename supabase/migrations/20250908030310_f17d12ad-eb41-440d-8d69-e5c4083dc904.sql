-- Strengthen admin role checking with additional security measures
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_exists boolean;
    role_count integer;
BEGIN
    -- Check if user exists and is authenticated
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verify user exists in auth.users (basic check)
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
    IF NOT user_exists THEN
        RETURN false;
    END IF;
    
    -- Check for admin role with additional validation
    SELECT COUNT(*) INTO role_count
    FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND role = 'admin';
    
    -- Log admin access attempt for audit purposes
    IF role_count > 0 THEN
        INSERT INTO public.audit_log (
            user_id,
            action,
            p_table_name,
            sensitive_data_accessed,
            created_at
        ) VALUES (
            user_id,
            'ADMIN_CHECK',
            'user_roles',
            true,
            now()
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN role_count > 0;
END;
$$;

-- Add enhanced rate limiting for sensitive p_actions
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
    p_user_id uuid DEFAULT auth.uid(), 
    p_operation text DEFAULT 'general'::text, 
    p_limit_per_hour integer DEFAULT 50
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- CREATE OR REPLACE FUNCTION to validate input data
CREATE OR REPLACE FUNCTION public.validate_contact_input(
    p_name text,
    p_email text DEFAULT null,
    p_phone text DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Check name length and content
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 OR LENGTH(TRIM(p_name)) > 100 THEN
        RETURN false;
    END IF;
    
    -- Validate email if provided
    IF p_email IS NOT NULL THEN
        IF NOT (p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Validate phone if provided
    IF p_phone IS NOT NULL THEN
        -- Remove common formatting and check if it's a valid phone number
        IF NOT (REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g') ~ '^\+?[0-9]{10,15}$') THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;

-- Add trigger to validate inputs before insertion
CREATE OR REPLACE FUNCTION public.validate_partner_referral_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate input data
    IF NOT validate_contact_input(NEW.name, NULL, NEW.contact_text) THEN
        RAISE EXCEPTION 'Invalid input data provided';
    END IF;
    
    -- Log the referral submission for audit purposes
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        p_record_id,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        auth.uid(),
        'REFERRAL_SUBMIT',
        'partner_referrals',
        NEW.id,
        true,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger for partner referrals validation
DROP TRIGGER IF EXISTS validate_partner_referral_trigger ON public.partner_referrals;
CREATE TRIGGER validate_partner_referral_trigger
    BEFORE INSERT ON public.partner_referrals
    FOR EACH ROW
    EXECUTE FUNCTION validate_partner_referral_input();

-- Add similar validation for partnership requests
CREATE OR REPLACE FUNCTION public.validate_partnership_request_input()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate input data
    IF NOT validate_contact_input(NEW.organization_name, NEW.contact_email, NULL) THEN
        RAISE EXCEPTION 'Invalid input data provided';
    END IF;
    
    -- Additional validation for organization name and description
    IF LENGTH(TRIM(NEW.description)) < 10 OR LENGTH(TRIM(NEW.description)) > 1000 THEN
        RAISE EXCEPTION 'Description must be between 10 and 1000 characters';
    END IF;
    
    -- Log the partnership request for audit purposes
    INSERT INTO public.audit_log (
        user_id,
        action,
        p_table_name,
        p_record_id,
        sensitive_data_accessed,
        created_at
    ) VALUES (
        auth.uid(),
        'PARTNERSHIP_REQUEST',
        'partnership_requests',
        NEW.id,
        true,
        now()
    ) ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger for partnership requests validation
DROP TRIGGER IF EXISTS validate_partnership_request_trigger ON public.partnership_requests;
CREATE TRIGGER validate_partnership_request_trigger
    BEFORE INSERT ON public.partnership_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_partnership_request_input();