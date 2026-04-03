-- Create organizations table (for reference in other tables)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  organization_type text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view verified organizations" ON public.organizations; CREATE POLICY "Anyone can view verified organizations" ON public.organizations FOR SELECT
  USING (verified = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations; CREATE POLICY "Admins can manage organizations" ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update contact_access_justifications to reference organizations
ALTER TABLE public.contact_access_justifications
  ADD CONSTRAINT fk_organization
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.email_campaigns; CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create newsletter_subscriptions table (rename existing newsletter_subscribers)
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  subscription_source text,
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscriptions; CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscriptions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions; CREATE POLICY "Users can update own subscription" ON public.newsletter_subscriptions FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admins can view subscriptions" ON public.newsletter_subscriptions; CREATE POLICY "Admins can view subscriptions" ON public.newsletter_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create website_analytics table
CREATE TABLE IF NOT EXISTS public.website_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  action_type text NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  session_id text NOT NULL,
  referrer text,
  user_agent text,
  ip_address text,
  event_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.website_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create analytics" ON public.website_analytics; CREATE POLICY "Anyone can create analytics" ON public.website_analytics FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view analytics" ON public.website_analytics; CREATE POLICY "Admins can view analytics" ON public.website_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX idx_website_analytics_created_at ON public.website_analytics(created_at);
CREATE INDEX idx_website_analytics_page_path ON public.website_analytics(page_path);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations; CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns; CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions; CREATE TRIGGER update_newsletter_subscriptions_updated_at BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();