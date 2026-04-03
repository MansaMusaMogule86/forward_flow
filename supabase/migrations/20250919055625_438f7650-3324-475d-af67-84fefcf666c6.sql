-- Create comprehensive admin tracking tables for all user interactions

-- Contact submissions from contact forms
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'contact', -- contact, coaching, booking
  status TEXT NOT NULL DEFAULT 'new',
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support program applications and requests
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL, -- speaker, corporate_training, ai_consultation, grant_inquiry
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  additional_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking requests from calendar
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_time TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Website analytics and visitor tracking
CREATE TABLE IF NOT EXISTS public.website_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  action_type TEXT NOT NULL DEFAULT 'page_view',
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_submissions
DROP POLICY IF EXISTS "Admins can manage all contact submissions" ON public.contact_submissions; CREATE POLICY "Admins can manage all contact submissions" ON public.contact_submissions
FOR ALL
TO authenticated
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own contact submissions" ON public.contact_submissions; CREATE POLICY "Users can view their own contact submissions" ON public.contact_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON public.contact_submissions; CREATE POLICY "Anyone can insert contact submissions" ON public.contact_submissions
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create RLS policies for support_requests
DROP POLICY IF EXISTS "Admins can manage all support requests" ON public.support_requests; CREATE POLICY "Admins can manage all support requests" ON public.support_requests
FOR ALL
TO authenticated
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own support requests" ON public.support_requests; CREATE POLICY "Users can view their own support requests" ON public.support_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert support requests" ON public.support_requests; CREATE POLICY "Anyone can insert support requests" ON public.support_requests
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create RLS policies for booking_requests
DROP POLICY IF EXISTS "Admins can manage all booking requests" ON public.booking_requests; CREATE POLICY "Admins can manage all booking requests" ON public.booking_requests
FOR ALL
TO authenticated
USING (is_user_admin(auth.uid()))
WITH CHECK (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own booking requests" ON public.booking_requests; CREATE POLICY "Users can view their own booking requests" ON public.booking_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert booking requests" ON public.booking_requests; CREATE POLICY "Anyone can insert booking requests" ON public.booking_requests
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create RLS policies for website_analytics
DROP POLICY IF EXISTS "Admins can view all website analytics" ON public.website_analytics; CREATE POLICY "Admins can view all website analytics" ON public.website_analytics
FOR SELECT
TO authenticated
USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert website analytics" ON public.website_analytics; CREATE POLICY "System can insert website analytics" ON public.website_analytics
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_form_type ON public.contact_submissions(form_type);

CREATE INDEX idx_support_requests_status ON public.support_requests(status);
CREATE INDEX idx_support_requests_created_at ON public.support_requests(created_at DESC);
CREATE INDEX idx_support_requests_type ON public.support_requests(request_type);

CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_booking_requests_created_at ON public.booking_requests(created_at DESC);
CREATE INDEX idx_booking_requests_date ON public.booking_requests(booking_date);

CREATE INDEX idx_website_analytics_page_path ON public.website_analytics(page_path);
CREATE INDEX idx_website_analytics_created_at ON public.website_analytics(created_at DESC);
CREATE INDEX idx_website_analytics_action_type ON public.website_analytics(action_type);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_contact_submissions_updated_at ON public.contact_submissions; CREATE TRIGGER update_contact_submissions_updated_at BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_requests_updated_at ON public.support_requests; CREATE TRIGGER update_support_requests_updated_at BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON public.booking_requests; CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();