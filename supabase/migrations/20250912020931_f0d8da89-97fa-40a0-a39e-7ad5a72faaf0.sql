-- Fix critical security issue: Organization contact data exposure
-- Create partner verification system and update RLS policies

-- Create partner_verifications table to track approved partners
CREATE TABLE IF NOT EXISTS public.partner_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,
  verification_type TEXT NOT NULL DEFAULT 'partner',
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on partner_verifications
ALTER TABLE public.partner_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for partner_verifications
DROP POLICY IF EXISTS "Users can view their own verifications" ON public.partner_verifications; CREATE POLICY "Users can view their own verifications" ON public.partner_verifications
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all verifications" ON public.partner_verifications; CREATE POLICY "Admins can manage all verifications" ON public.partner_verifications
FOR ALL
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- CREATE OR REPLACE FUNCTION to check if user is verified partner
CREATE OR REPLACE FUNCTION public.is_verified_partner(user_id UUID DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admins are always considered verified
  IF is_user_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Check for active partner verification
  RETURN EXISTS(
    SELECT 1 
    FROM public.partner_verifications 
    WHERE partner_verifications.user_id = is_verified_partner.user_id 
    AND status = 'approved'
  );
END;
$$;

-- Update organizations RLS policy to require partner verification for contact access
DROP POLICY IF EXISTS "authenticated_contact_access" ON public.organizations;

DROP POLICY IF EXISTS "verified_partner_contact_access" ON public.organizations; CREATE POLICY "verified_partner_contact_access" ON public.organizations
FOR SELECT
USING (
  verified = true 
  AND (
    auth.uid() IS NULL -- Public access to basic info
    OR (
      auth.uid() IS NOT NULL 
      AND is_verified_partner(auth.uid())
      AND check_enhanced_rate_limit(auth.uid(), 'org_contact_access', 10)
    )
  )
);

-- CREATE OR REPLACE FUNCTION for enhanced contact access logging
CREATE OR REPLACE FUNCTION public.log_contact_access(org_id UUID, contact_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
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
    'CONTACT_ACCESS_' || upper(contact_type),
    'organizations',
    org_id,
    true,
    inet_client_addr(),
    current_setting('request.header.user-agent', true),
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Create trigger for partner verification updates
DROP TRIGGER IF EXISTS update_partner_verifications_updated_at ON public.partner_verifications; CREATE TRIGGER update_partner_verifications_updated_at BEFORE UPDATE ON public.partner_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced password validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Minimum 8 characters
  IF LENGTH(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF NOT (password ~ '[A-Z]') THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one number
  IF NOT (password ~ '[0-9]') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;