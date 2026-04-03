-- Fix 1: Organizations table - restrict contact info to verified orgs only
-- Currently ANY authenticated user can see ALL organizations including unverified ones
-- This fix ensures only verified organizations are visible to regular users
DROP POLICY IF EXISTS "Anyone can view verified organizations" ON public.organizations;

DROP POLICY IF EXISTS "Public can view verified organizations only" ON public.organizations; CREATE POLICY "Public can view verified organizations only" ON public.organizations 
FOR SELECT 
USING (verified = true);

-- Admins can still see all organizations via existing "Admins can manage organizations" policy

-- Fix 2: Add audit logging for when profiles are accessed
-- While RLS already prevents enumeration (users can only see their own profile),
-- this adds monitoring to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'PROFILE_ACCESSED',
    'profile',
    auth.uid(),
    jsonb_build_object(
      'timestamp', NOW(),
      'access_type', 'view'
    ),
    'info'
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Fix 3: Enhanced bookings security - create a secure view that masks sensitive data for admins
-- until proper justification is provided
CREATE OR REPLACE VIEW public.bookings_secure AS
SELECT 
  b.id,
  b.user_id,
  b.booking_type,
  b.scheduled_date,
  b.scheduled_time,
  b.duration_minutes,
  b.status,
  -- Mask sensitive fields for admins without justification
  CASE 
    WHEN b.user_id = auth.uid() THEN b.name
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN '***REDACTED***'
    ELSE NULL
  END as name,
  CASE 
    WHEN b.user_id = auth.uid() THEN b.email
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN '***REDACTED***'
    ELSE NULL
  END as email,
  CASE 
    WHEN b.user_id = auth.uid() THEN b.phone
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN '***REDACTED***'
    ELSE NULL
  END as phone,
  b.notes,
  b.created_at,
  b.updated_at,
  b.reminder_sent
FROM public.bookings b;

-- Grant access to the secure view
GRANT SELECT ON public.bookings_secure TO authenticated;

-- Add comment documenting the security model
COMMENT ON VIEW public.bookings_secure IS 'Secure view of bookings that masks sensitive customer data for admins. Admins should use the contact_access_justifications system to request access to specific customer contact information.';