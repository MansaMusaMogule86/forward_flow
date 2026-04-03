-- Create partner_verifications table
CREATE TABLE IF NOT EXISTS public.partner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name text NOT NULL,
  organization_type text NOT NULL,
  verification_documents jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications" ON public.partner_verifications; CREATE POLICY "Users can view own verifications" ON public.partner_verifications FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create verifications" ON public.partner_verifications; CREATE POLICY "Authenticated users can create verifications" ON public.partner_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update verifications" ON public.partner_verifications; CREATE POLICY "Admins can update verifications" ON public.partner_verifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create contact_access_justifications table
CREATE TABLE IF NOT EXISTS public.contact_access_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  business_justification text NOT NULL,
  access_purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_access_justifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can view all justifications" ON public.contact_access_justifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can create justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can create justifications" ON public.contact_access_justifications FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Admins can update justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can update justifications" ON public.contact_access_justifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create partnership_requests table
CREATE TABLE IF NOT EXISTS public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create partnership requests" ON public.partnership_requests; CREATE POLICY "Anyone can create partnership requests" ON public.partnership_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can view partnership requests" ON public.partnership_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can update partnership requests" ON public.partnership_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_partner_verifications_updated_at ON public.partner_verifications; CREATE TRIGGER update_partner_verifications_updated_at BEFORE UPDATE ON public.partner_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_access_justifications_updated_at ON public.contact_access_justifications; CREATE TRIGGER update_contact_access_justifications_updated_at BEFORE UPDATE ON public.contact_access_justifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partnership_requests_updated_at ON public.partnership_requests; CREATE TRIGGER update_partnership_requests_updated_at BEFORE UPDATE ON public.partnership_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if admin exists
CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'::app_role
  );
$$;

-- Function to create first admin user
CREATE OR REPLACE FUNCTION public.create_first_admin_user(admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if admin already exists
  SELECT public.check_admin_exists() INTO admin_exists;
  
  IF admin_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin user already exists');
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = admin_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Create admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Admin user created successfully');
END;
$$;

-- Function to request admin contact access
CREATE OR REPLACE FUNCTION public.request_admin_contact_access(
  p_organization_id uuid,
  p_business_justification text,
  p_access_purpose text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_request_id uuid;
BEGIN
  INSERT INTO public.contact_access_justifications (
    admin_user_id,
    organization_id,
    business_justification,
    access_purpose,
    expires_at
  ) VALUES (
    auth.uid(),
    p_organization_id,
    p_business_justification,
    p_access_purpose,
    now() + interval '30 days'
  )
  RETURNING id INTO new_request_id ON CONFLICT DO NOTHING;
  
  RETURN new_request_id;
END;
$$;

-- Function to approve admin contact access
CREATE OR REPLACE FUNCTION public.approve_admin_contact_access(
  p_request_id uuid,
  p_decision text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve access requests';
  END IF;
  
  UPDATE public.contact_access_justifications
  SET 
    status = p_decision,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$$;