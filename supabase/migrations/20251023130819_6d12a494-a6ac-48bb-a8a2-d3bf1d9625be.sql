-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  ) ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  state TEXT,
  city TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tags TEXT[],
  verified BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_resources_category ON public.resources(category);
CREATE INDEX idx_resources_state ON public.resources(state);
CREATE INDEX idx_resources_verified ON public.resources(verified);

-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  organization_type TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_partners_user_id ON public.partners(user_id);
CREATE INDEX idx_partners_verified ON public.partners(verified);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  justification TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_verification_requests_partner_id ON public.verification_requests(partner_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_action TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Create learning_progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pathway_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  progress_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, pathway_id, module_id)
);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX idx_learning_progress_pathway_id ON public.learning_progress(pathway_id);

-- Create partner_referrals table
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_text TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_partner_referrals_partner_id ON public.partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_status ON public.partner_referrals(status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles; CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources; CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners; CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON public.verification_requests; CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers; CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON public.learning_progress; CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_referrals_updated_at ON public.partner_referrals; CREATE TRIGGER update_partner_referrals_updated_at BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles; CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for resources
DROP POLICY IF EXISTS "Anyone can view verified resources" ON public.resources; CREATE POLICY "Anyone can view verified resources" ON public.resources
  FOR SELECT USING (verified = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create resources" ON public.resources; CREATE POLICY "Authenticated users can create resources" ON public.resources
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own resources" ON public.resources; CREATE POLICY "Users can update own resources" ON public.resources
  FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources; CREATE POLICY "Admins can delete resources" ON public.resources
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for partners
DROP POLICY IF EXISTS "Partners can view own profile" ON public.partners; CREATE POLICY "Partners can view own profile" ON public.partners
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create partner profile" ON public.partners; CREATE POLICY "Authenticated users can create partner profile" ON public.partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Partners can update own profile" ON public.partners; CREATE POLICY "Partners can update own profile" ON public.partners
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any partner" ON public.partners; CREATE POLICY "Admins can update any partner" ON public.partners
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for verification_requests
DROP POLICY IF EXISTS "Partners can view own verification requests" ON public.verification_requests; CREATE POLICY "Partners can view own verification requests" ON public.verification_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = verification_requests.partner_id 
      AND partners.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Partners can create verification requests" ON public.verification_requests; CREATE POLICY "Partners can create verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = verification_requests.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests; CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contact_submissions
DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions; CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can create contact submissions" ON public.contact_submissions; CREATE POLICY "Anyone can create contact submissions" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for newsletter_subscribers
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers; CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscribers; CREATE POLICY "Users can update own subscription" ON public.newsletter_subscribers
  FOR UPDATE USING (true);

-- RLS Policies for analytics_events
DROP POLICY IF EXISTS "Anyone can create analytics events" ON public.analytics_events; CREATE POLICY "Anyone can create analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events; CREATE POLICY "Admins can view analytics events" ON public.analytics_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for learning_progress
DROP POLICY IF EXISTS "Users can view own learning progress" ON public.learning_progress; CREATE POLICY "Users can view own learning progress" ON public.learning_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own learning progress" ON public.learning_progress; CREATE POLICY "Users can create own learning progress" ON public.learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learning progress" ON public.learning_progress; CREATE POLICY "Users can update own learning progress" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for partner_referrals
DROP POLICY IF EXISTS "Partners can view own referrals" ON public.partner_referrals; CREATE POLICY "Partners can view own referrals" ON public.partner_referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = partner_referrals.partner_id 
      AND partners.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Partners can create referrals" ON public.partner_referrals; CREATE POLICY "Partners can create referrals" ON public.partner_referrals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = partner_referrals.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners can update own referrals" ON public.partner_referrals; CREATE POLICY "Partners can update own referrals" ON public.partner_referrals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = partner_referrals.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles; CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles; CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));