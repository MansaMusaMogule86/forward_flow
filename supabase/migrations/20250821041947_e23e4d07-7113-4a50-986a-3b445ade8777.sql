-- Create partner_referrals table
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_text TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partnership_requests table
CREATE TABLE IF NOT EXISTS public.partnership_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum and table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = is_user_admin.p_user_id 
    AND role = 'admin'
  );
$$;

-- RLS Policies for partner_referrals (admin can view/manage all)
DROP POLICY IF EXISTS "Admins can view all partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Admins can view all partner referrals" ON public.partner_referrals; CREATE POLICY "Admins can view all partner referrals" ON public.partner_referrals FOR SELECT 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Anyone can insert partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Anyone can insert partner referrals" ON public.partner_referrals; CREATE POLICY "Anyone can insert partner referrals" ON public.partner_referrals FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update partner referrals" ON public.partner_referrals;
DROP POLICY IF EXISTS "Admins can update partner referrals" ON public.partner_referrals; CREATE POLICY "Admins can update partner referrals" ON public.partner_referrals FOR UPDATE 
USING (public.is_user_admin());

-- RLS Policies for partnership_requests (admin can view/manage all)
DROP POLICY IF EXISTS "Admins can view all partnership requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Admins can view all partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can view all partnership requests" ON public.partnership_requests FOR SELECT 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Anyone can insert partnership requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Anyone can insert partnership requests" ON public.partnership_requests; CREATE POLICY "Anyone can insert partnership requests" ON public.partnership_requests FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update partnership requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Admins can update partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can update partnership requests" ON public.partnership_requests FOR UPDATE 
USING (public.is_user_admin());

-- RLS Policies for user_roles (admins can manage, users can view their own)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles; CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles; CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles; CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL 
USING (public.is_user_admin());

-- CREATE OR REPLACE FUNCTION to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_partner_referrals_updated_at ON public.partner_referrals;
DROP TRIGGER IF EXISTS update_partner_referrals_updated_at ON public.partner_referrals; CREATE TRIGGER update_partner_referrals_updated_at BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partnership_requests_updated_at ON public.partnership_requests;
DROP TRIGGER IF EXISTS update_partnership_requests_updated_at ON public.partnership_requests; CREATE TRIGGER update_partnership_requests_updated_at BEFORE UPDATE ON public.partnership_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();