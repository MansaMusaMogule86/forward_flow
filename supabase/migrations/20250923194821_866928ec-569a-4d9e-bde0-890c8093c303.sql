-- Fix function search path issues for trigger functions
-- This addresses the remaining Function Search Path Mutable warnings

-- Fix newsletter trigger function
ALTER FUNCTION public.update_newsletter_subscription_updated_at() 
SET search_path = 'public';

-- Fix email campaign trigger function  
ALTER FUNCTION public.update_email_campaign_updated_at() 
SET search_path = 'public';

-- Fix any other trigger functions that might be missing search_path
-- These are commonly missed security functions
CREATE OR REPLACE FUNCTION public.set_function_search_paths()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
    func_record RECORD;
    sql_stmt TEXT;
BEGIN
    -- Find all functions without proper search_path and fix them
    FOR func_record IN
        SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE '_pg_%'
        -- Skip functions that already have search_path set
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc p2
            WHERE p2.oid = p.oid
            AND p2.prosrc LIKE '%search_path%'
        )
        AND p.proname IN (
            'cleanup_audit_logs',
            'log_payment_p_action', 
            'get_organizations_with_contacts',
            'get_masked_organization_contact',
            'get_partner_stats'
        )
    LOOP
        BEGIN
            sql_stmt := format('ALTER FUNCTION public.%I(%s) SET search_path = ''public''', 
                              func_record.function_name, 
                              func_record.args);
            EXECUTE sql_stmt;
            
            RAISE NOTICE 'Fixed search_path for function: %', func_record.function_name;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not fix search_path for function %: %', func_record.function_name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Execute the function to fix search paths
SELECT public.set_function_search_paths();

-- Drop the helper function as it's no longer needed
DROP FUNCTION public.set_function_search_paths();