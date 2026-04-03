-- Fix security warnings by setting proper search_path for functions

-- Update validate_contact_input function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_contact_input(
    p_name text,
    p_email text DEFAULT null,
    p_phone text DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
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

-- Update validate_partner_referral_input function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_partner_referral_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
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

-- Update validate_partnership_request_input function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_partnership_request_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
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