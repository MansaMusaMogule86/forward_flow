-- Clean up unused database tables and functionality
-- Keep only tables related to core functionality: user roles, trials, subscriptions, modules

-- Ensure core foundations exist (in case they were skipped by earlier migration history)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'partner');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id;
$$;

-- Drop unused tables related to shop functionality
DROP TABLE IF EXISTS public.shop_custom_ai_art_requests CASCADE;
DROP TABLE IF EXISTS public.shop_digital_assets CASCADE;
DROP TABLE IF EXISTS public.shop_digital_products CASCADE;
DROP TABLE IF EXISTS public.shop_newsletter_signups CASCADE;
DROP TABLE IF EXISTS public.shop_signed_art_pieces CASCADE;
DROP TABLE IF EXISTS public.shop_signed_artwork_requests CASCADE;

-- Drop unused affiliate tables
DROP TABLE IF EXISTS public.affiliate_clicks CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;

-- Drop unused commerce-related tables
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.tool_submissions CASCADE;
DROP TABLE IF EXISTS public.tool_usage CASCADE;
DROP TABLE IF EXISTS public.user_access CASCADE;
DROP TABLE IF EXISTS public.user_credits CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Create tables for core functionality
-- Partner referrals table
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_text TEXT NOT NULL,
  notes TEXT NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Partnership requests table
CREATE TABLE IF NOT EXISTS public.partnership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Resources table for community resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  contact_text TEXT,
  website_url TEXT,
  category TEXT,
  state_code TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_referrals
DROP POLICY IF EXISTS "Anyone can submit referrals" ON public.partner_referrals; CREATE POLICY "Anyone can submit referrals" ON public.partner_referrals
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage referrals" ON public.partner_referrals; CREATE POLICY "Admins can view and manage referrals" ON public.partner_referrals
FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- RLS policies for partnership_requests
DROP POLICY IF EXISTS "Anyone can submit partnership requests" ON public.partnership_requests; CREATE POLICY "Anyone can submit partnership requests" ON public.partnership_requests
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage partnership requests" ON public.partnership_requests; CREATE POLICY "Admins can view and manage partnership requests" ON public.partnership_requests
FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- RLS policies for resources
DROP POLICY IF EXISTS "Anyone can view active resources" ON public.resources; CREATE POLICY "Anyone can view active resources" ON public.resources
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage all resources" ON public.resources; CREATE POLICY "Admins can manage all resources" ON public.resources
FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_partner_referrals_updated_at ON public.partner_referrals; CREATE TRIGGER update_partner_referrals_updated_at BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partnership_requests_updated_at ON public.partnership_requests; CREATE TRIGGER update_partnership_requests_updated_at BEFORE UPDATE ON public.partnership_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources; CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();