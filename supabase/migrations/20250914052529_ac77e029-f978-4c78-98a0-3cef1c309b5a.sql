-- Security Fix: Implement Contact Access Control System
-- This addresses the security issue where authenticated partners could harvest contact data

-- Step 1: Create contact access permissions table
CREATE TABLE IF NOT EXISTS public.contact_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  request_reason TEXT NOT NULL,
  business_justification TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one active request per user per organization
  UNIQUE(requester_id, organization_id)
);

-- Step 2: Enable RLS on the new table
ALTER TABLE public.contact_access_permissions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for contact access permissions
DROP POLICY IF EXISTS "Users can view their own access requests" ON public.contact_access_permissions; CREATE POLICY "Users can view their own access requests" ON public.contact_access_permissions
FOR SELECT
USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can create access requests" ON public.contact_access_permissions; CREATE POLICY "Users can create access requests" ON public.contact_access_permissions
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND is_verified_partner(auth.uid())
  AND check_enhanced_rate_limit(auth.uid(), 'access_request', 5)
);

DROP POLICY IF EXISTS "Users can update their own pending requests" ON public.contact_access_permissions; CREATE POLICY "Users can update their own pending requests" ON public.contact_access_permissions
FOR UPDATE
USING (auth.uid() = requester_id AND status = 'pending')
WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Admins can manage all access requests" ON public.contact_access_permissions; CREATE POLICY "Admins can manage all access requests" ON public.contact_access_permissions
FOR ALL
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- Step 4: CREATE OR REPLACE FUNCTION to check if user has contact access permission
CREATE OR REPLACE FUNCTION public.has_contact_access_permission(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Admins always have access
  IF is_user_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for approved and non-expired permission
  RETURN EXISTS(
    SELECT 1
    FROM public.contact_access_permissions
    WHERE requester_id = user_id
    AND organization_id = org_id
    AND status = 'approved'
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Step 5: Replace the overly permissive policy with a secure one
DROP POLICY IF EXISTS "authenticated_partner_contact_access" ON public.organizations;

DROP POLICY IF EXISTS "secure_contact_access_with_permission" ON public.organizations; CREATE POLICY "secure_contact_access_with_permission" ON public.organizations
FOR SELECT
USING (
  verified = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Admin access (unrestricted)
    is_user_admin(auth.uid())
    -- OR explicit permission granted
    OR has_contact_access_permission(auth.uid(), id)
  )
  AND check_enhanced_rate_limit(auth.uid(), 'org_contact_access', 20)
);

-- Step 6: CREATE OR REPLACE FUNCTION to request contact access
CREATE OR REPLACE FUNCTION public.request_contact_access(
  org_id UUID,
  reason TEXT,
  justification TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Verify user is authenticated and verified partner
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT is_verified_partner(auth.uid()) THEN
    RAISE EXCEPTION 'Verified partner status required';
  END IF;
  
  -- Check rate limits
  IF NOT check_enhanced_rate_limit(auth.uid(), 'contact_access_request', 3) THEN
    RAISE EXCEPTION 'Rate limit exceeded for contact access requests';
  END IF;
  
  -- Validate organization exists and is verified
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id = org_id AND verified = true) THEN
    RAISE EXCEPTION 'Organization not found or not verified';
  END IF;
  
  -- Create or update access request
  INSERT INTO public.contact_access_permissions (
    requester_id,
    organization_id,
    request_reason,
    business_justification
  ) VALUES (
    auth.uid(),
    org_id,
    reason,
    justification
  ) 
  ON CONFLICT (requester_id, organization_id) 
  DO UPDATE SET
    request_reason = EXCLUDED.request_reason,
    business_justification = EXCLUDED.business_justification,
    status = 'pending',
    updated_at = now()
  RETURNING id INTO request_id ON CONFLICT DO NOTHING;
  
  -- Log the access request
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'CONTACT_ACCESS_REQUESTED',
    'contact_access_permissions',
    request_id,
    true,
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN request_id;
END;
$$;

-- Step 7: CREATE OR REPLACE FUNCTION for admins to approve/deny requests
CREATE OR REPLACE FUNCTION public.manage_contact_access_request(
  request_id UUID,
  new_status TEXT,
  expiry_days INTEGER DEFAULT 90
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Require admin privileges
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Validate status
  IF new_status NOT IN ('approved', 'denied', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved, denied, or revoked';
  END IF;
  
  -- Set expiry date for approved requests
  IF new_status = 'approved' AND expiry_days > 0 THEN
    expires_at_val := now() + (expiry_days || ' days')::INTERVAL;
  END IF;
  
  -- Update the request
  UPDATE public.contact_access_permissions
  SET 
    status = new_status,
    approved_by = auth.uid(),
    approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE approved_at END,
    expires_at = CASE WHEN new_status = 'approved' THEN expires_at_val ELSE NULL END,
    updated_at = now()
  WHERE id = request_id;
  
  -- Log the admin action
  INSERT INTO public.audit_log (
    user_id,
    action,
    p_table_name,
    p_record_id,
    sensitive_data_accessed,
    created_at
  ) VALUES (
    auth.uid(),
    'CONTACT_ACCESS_' || upper(new_status),
    'contact_access_permissions',
    request_id,
    true,
    now()
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Step 8: Create triggers for automatic cleanup and auditing
CREATE OR REPLACE FUNCTION public.cleanup_expired_contact_permissions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Revoke expired permissions
  UPDATE public.contact_access_permissions
  SET status = 'revoked', updated_at = now()
  WHERE status = 'approved'
  AND expires_at IS NOT NULL
  AND expires_at < now();
END;
$$;