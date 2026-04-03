-- ============================================================================
-- COMPREHENSIVE MIGRATION: Full Schema + SparkLoop/Beehiiv Monetization
-- Target: gzukhsqgkwljfvwkfuno
-- ============================================================================

-- Create app_role enum (if not exists)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user', 'partner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES (Preserve existing structure)
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User roles table (security-critical)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Newsletter subscriptions (EXTENDED for monetization)
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'active',
  subscription_source text,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- NEW: SparkLoop integration
  sparkloop_subscriber_id text,
  sparkloop_referral_code text,
  sparkloop_earnings_generated numeric DEFAULT 0,
  -- NEW: Beehiiv integration
  beehiiv_subscriber_id text,
  beehiiv_earnings_generated numeric DEFAULT 0
);

-- NEW: Monetization earnings table
CREATE TABLE IF NOT EXISTS public.monetization_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.newsletter_subscriptions(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('sparkloop', 'beehiiv')),
  partner_newsletter text NOT NULL,
  earnings_amount numeric NOT NULL CHECK (earnings_amount >= 0),
  payout_status text DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid', 'cancelled')),
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_name text NOT NULL,
  organization_type text,
  phone text,
  website text,
  address text,
  verified boolean DEFAULT false,
  verification_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  organization text,
  type text,
  state text,
  state_code text,
  city text,
  county text,
  website_url text,
  phone text,
  email text,
  address text,
  tags text[],
  verified boolean DEFAULT false,
  justice_friendly boolean DEFAULT false,
  rating numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Additional tables (preserving existing structure)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_action text NOT NULL,
  page_url text,
  referrer text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id),
  event_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_trial_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  ai_endpoint text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz,
  usage_count integer DEFAULT 0,
  is_expired boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  ai_endpoint text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  message_role text NOT NULL,
  message_content text NOT NULL,
  message_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  severity text DEFAULT 'info',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  alert_data jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_access_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  business_justification text NOT NULL,
  access_purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECURITY FUNCTIONS (Security definer to avoid RLS recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
  )
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'::app_role
  );
$$;

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
  SELECT public.check_admin_exists() INTO admin_exists;
  
  IF admin_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin user already exists');
  END IF;
  
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = admin_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Admin user created successfully');
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles; CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions;
DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions; CREATE TRIGGER update_newsletter_subscriptions_updated_at BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns;
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns; CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_access_justifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles; CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles; CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles; CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles; CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Newsletter subscriptions policies
DROP POLICY IF EXISTS "Admins can view subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view subscriptions" ON public.newsletter_subscriptions; CREATE POLICY "Admins can view subscriptions" ON public.newsletter_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscriptions; CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscriptions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions; CREATE POLICY "Users can update own subscription" ON public.newsletter_subscriptions FOR UPDATE
  USING (true);

-- NEW: Monetization earnings policies
DROP POLICY IF EXISTS "Admins can view earnings" ON public.monetization_earnings;
DROP POLICY IF EXISTS "Admins can view earnings" ON public.monetization_earnings; CREATE POLICY "Admins can view earnings" ON public.monetization_earnings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can create earnings" ON public.monetization_earnings;
DROP POLICY IF EXISTS "System can create earnings" ON public.monetization_earnings; CREATE POLICY "System can create earnings" ON public.monetization_earnings FOR INSERT
  WITH CHECK (true);

-- Email campaigns policies
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.email_campaigns; CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Organizations policies
DROP POLICY IF EXISTS "Anyone can view verified organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view verified organizations" ON public.organizations; CREATE POLICY "Anyone can view verified organizations" ON public.organizations FOR SELECT
  USING ((verified = true) OR (auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations; CREATE POLICY "Admins can manage organizations" ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Resources policies
DROP POLICY IF EXISTS "Anyone can view verified resources" ON public.resources;
DROP POLICY IF EXISTS "Anyone can view verified resources" ON public.resources; CREATE POLICY "Anyone can view verified resources" ON public.resources FOR SELECT
  USING ((verified = true) OR (auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "Authenticated users can create resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can create resources" ON public.resources; CREATE POLICY "Authenticated users can create resources" ON public.resources FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own resources" ON public.resources;
DROP POLICY IF EXISTS "Users can update own resources" ON public.resources; CREATE POLICY "Users can update own resources" ON public.resources FOR UPDATE
  USING ((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources; CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Analytics policies
DROP POLICY IF EXISTS "Anyone can create analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can create analytics" ON public.analytics_events; CREATE POLICY "Anyone can create analytics" ON public.analytics_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events; CREATE POLICY "Admins can view analytics events" ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- AI trial sessions policies
DROP POLICY IF EXISTS "Anyone can create trial sessions" ON public.ai_trial_sessions;
DROP POLICY IF EXISTS "Anyone can create trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Anyone can create trial sessions" ON public.ai_trial_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own trial sessions" ON public.ai_trial_sessions;
DROP POLICY IF EXISTS "Users can view own trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Users can view own trial sessions" ON public.ai_trial_sessions FOR SELECT
  USING ((user_id = auth.uid()) OR (session_id IN (SELECT COALESCE(current_setting('app.session_id', true), ''))));

DROP POLICY IF EXISTS "Users can update own trial sessions" ON public.ai_trial_sessions;
DROP POLICY IF EXISTS "Users can update own trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Users can update own trial sessions" ON public.ai_trial_sessions FOR UPDATE
  USING ((user_id = auth.uid()) OR (session_id IN (SELECT COALESCE(current_setting('app.session_id', true), ''))));

-- Chat history policies
DROP POLICY IF EXISTS "Anyone can create chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Anyone can create chat history" ON public.chat_history; CREATE POLICY "Anyone can create chat history" ON public.chat_history FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history; CREATE POLICY "Users can view own chat history" ON public.chat_history FOR SELECT
  USING ((user_id = auth.uid()) OR (session_id IN (SELECT COALESCE(current_setting('app.session_id', true), ''))));

DROP POLICY IF EXISTS "Users can delete own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON public.chat_history; CREATE POLICY "Users can delete own chat history" ON public.chat_history FOR DELETE
  USING (user_id = auth.uid());

-- Audit logs policies
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs; CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs; CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Security alerts policies
DROP POLICY IF EXISTS "System can create security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "System can create security alerts" ON public.security_alerts; CREATE POLICY "System can create security alerts" ON public.security_alerts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Admins can view all security alerts" ON public.security_alerts; CREATE POLICY "Admins can view all security alerts" ON public.security_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Admins can update security alerts" ON public.security_alerts; CREATE POLICY "Admins can update security alerts" ON public.security_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Contact access policies
DROP POLICY IF EXISTS "Admins can create justifications" ON public.contact_access_justifications;
DROP POLICY IF EXISTS "Admins can create justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can create justifications" ON public.contact_access_justifications FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Admins can view all justifications" ON public.contact_access_justifications;
DROP POLICY IF EXISTS "Admins can view all justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can view all justifications" ON public.contact_access_justifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update justifications" ON public.contact_access_justifications;
DROP POLICY IF EXISTS "Admins can update justifications" ON public.contact_access_justifications; CREATE POLICY "Admins can update justifications" ON public.contact_access_justifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));