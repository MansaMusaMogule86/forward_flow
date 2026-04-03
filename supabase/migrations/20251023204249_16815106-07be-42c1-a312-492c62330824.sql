-- Create success stories table
CREATE TABLE IF NOT EXISTS public.success_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  title text NOT NULL,
  story text NOT NULL,
  outcome text,
  impact_metrics jsonb DEFAULT '{}'::jsonb,
  participant_name text,
  participant_testimonial text,
  images jsonb DEFAULT '[]'::jsonb,
  featured boolean DEFAULT false,
  published boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view published success stories" ON public.success_stories; CREATE POLICY "Anyone can view published success stories" ON public.success_stories
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Partners can view own success stories" ON public.success_stories; CREATE POLICY "Partners can view own success stories" ON public.success_stories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = success_stories.partner_id
    AND partners.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can create success stories" ON public.success_stories; CREATE POLICY "Partners can create success stories" ON public.success_stories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = success_stories.partner_id
    AND partners.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can update own success stories" ON public.success_stories; CREATE POLICY "Partners can update own success stories" ON public.success_stories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = success_stories.partner_id
    AND partners.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage all success stories" ON public.success_stories; CREATE POLICY "Admins can manage all success stories" ON public.success_stories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_success_stories_updated_at ON public.success_stories; CREATE TRIGGER update_success_stories_updated_at BEFORE UPDATE ON public.success_stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_success_stories_published ON public.success_stories(published, featured, published_at DESC);
CREATE INDEX idx_success_stories_partner ON public.success_stories(partner_id);

-- Enable realtime for key admin tables
ALTER TABLE public.partner_referrals REPLICA IDENTITY FULL;
ALTER TABLE public.partnership_requests REPLICA IDENTITY FULL;
ALTER TABLE public.contact_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.support_requests REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.security_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.success_stories REPLICA IDENTITY FULL;

-- CREATE OR REPLACE FUNCTION to get partner stats including success stories
CREATE OR REPLACE FUNCTION public.get_partner_stats_detailed()
RETURNS TABLE(
  total_partners bigint,
  verified_partners bigint,
  pending_partners bigint,
  total_referrals bigint,
  total_success_stories bigint,
  published_success_stories bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COUNT(DISTINCT p.id) as total_partners,
    COUNT(DISTINCT p.id) FILTER (WHERE p.verified = true) as verified_partners,
    COUNT(DISTINCT p.id) FILTER (WHERE p.verification_status = 'pending') as pending_partners,
    COUNT(pr.id) as total_referrals,
    COUNT(ss.id) as total_success_stories,
    COUNT(ss.id) FILTER (WHERE ss.published = true) as published_success_stories
  FROM public.partners p
  LEFT JOIN public.partner_referrals pr ON p.id = pr.partner_id
  LEFT JOIN public.success_stories ss ON p.id = ss.partner_id;
$$;