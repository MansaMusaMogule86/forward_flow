-- Create newsletter subscriptions table
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  subscription_source TEXT DEFAULT 'website',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_subscriptions
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions; CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.newsletter_subscriptions; CREATE POLICY "Users can view their own subscription" ON public.newsletter_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can update their own subscription" ON public.newsletter_subscriptions; CREATE POLICY "Users can update their own subscription" ON public.newsletter_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.newsletter_subscriptions; CREATE POLICY "Admins can manage all subscriptions" ON public.newsletter_subscriptions 
FOR ALL 
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

-- RLS Policies for email_campaigns  
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns; CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns 
FOR ALL 
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_subscriptions_status ON public.newsletter_subscriptions(status);
CREATE INDEX idx_newsletter_subscriptions_user_id ON public.newsletter_subscriptions(user_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);

-- Create update trigger for newsletter_subscriptions
CREATE OR REPLACE FUNCTION public.update_newsletter_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions; CREATE TRIGGER update_newsletter_subscriptions_updated_at BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_newsletter_subscription_updated_at();

-- Create update trigger for email_campaigns
CREATE OR REPLACE FUNCTION public.update_email_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns; CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_campaign_updated_at();