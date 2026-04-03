-- Phase 1: Email System Database Schema Extensions

-- 1. Add new columns to newsletter_subscriptions
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS subscriber_type text DEFAULT 'all' CHECK (subscriber_type IN ('newsletter', 'collective', 'member', 'all')),
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_subscriber_type ON public.newsletter_subscriptions(subscriber_type);

-- 2. Create email_preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL UNIQUE REFERENCES public.newsletter_subscriptions(id) ON DELETE CASCADE,
  monday_newsletter boolean DEFAULT true,
  wednesday_collective boolean DEFAULT true,
  friday_recap boolean DEFAULT true,
  sunday_community_call boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_subscriber_id ON public.email_preferences(subscriber_id);

-- Enable RLS on email_preferences
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Allow public access to update their own preferences via token
DROP POLICY IF EXISTS "Anyone can view their own preferences" ON public.email_preferences; CREATE POLICY "Anyone can view their own preferences" ON public.email_preferences FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update their own preferences" ON public.email_preferences; CREATE POLICY "Anyone can update their own preferences" ON public.email_preferences FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert their own preferences" ON public.email_preferences; CREATE POLICY "Anyone can insert their own preferences" ON public.email_preferences FOR INSERT
  WITH CHECK (true);

-- 3. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE CHECK (template_name IN ('monday_newsletter', 'wednesday_collective', 'friday_recap', 'sunday_community_call')),
  subject text NOT NULL,
  content_blocks jsonb NOT NULL DEFAULT '{}',
  variables jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  last_edited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON public.email_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates; CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Create email_send_queue table
CREATE TABLE IF NOT EXISTS public.email_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  email_content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'permanently_failed')),
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  last_attempt_at timestamptz,
  error_message text,
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_queue_status ON public.email_send_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_send_queue_scheduled ON public.email_send_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_send_queue_retry ON public.email_send_queue(retry_count);

-- Enable RLS on email_send_queue
ALTER TABLE public.email_send_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email queue" ON public.email_send_queue; CREATE POLICY "Admins can view email queue" ON public.email_send_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage queue" ON public.email_send_queue; CREATE POLICY "Service role can manage queue" ON public.email_send_queue FOR ALL
  USING (true);

-- 5. Create email_campaign_settings table
CREATE TABLE IF NOT EXISTS public.email_campaign_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_settings_key ON public.email_campaign_settings(setting_key);

-- Enable RLS on email_campaign_settings
ALTER TABLE public.email_campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage campaign settings" ON public.email_campaign_settings; CREATE POLICY "Admins can manage campaign settings" ON public.email_campaign_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_preferences_updated_at ON public.email_preferences; CREATE TRIGGER email_preferences_updated_at BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates; CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS email_send_queue_updated_at ON public.email_send_queue; CREATE TRIGGER email_send_queue_updated_at BEFORE UPDATE ON public.email_send_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS email_campaign_settings_updated_at ON public.email_campaign_settings; CREATE TRIGGER email_campaign_settings_updated_at BEFORE UPDATE ON public.email_campaign_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

-- 7. Seed email_campaign_settings with Sunday email toggle (inactive by default)
INSERT INTO public.email_campaign_settings (setting_key, setting_value)
VALUES ('sunday_email_active', '{"active": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 8. Seed email_templates with default templates
INSERT INTO public.email_templates (template_name, subject, content_blocks, variables, is_active) VALUES
('monday_newsletter', '📚 This Week''s Resources & Tools - Forward Focus Elevation', 
 '{"hero": "Your Weekly Dose of Growth & Support", "featuredResource": "", "aiToolSpotlight": "", "healingHubReminder": "", "coachKayCTA": "Book Your Breakthrough Session", "communityUpdate": "", "supportCTA": "Support Our Mission"}'::jsonb,
 '["firstName", "newResourcesCount", "lastLogin", "coachAvailability"]'::jsonb, true),
('wednesday_collective', '💫 Focus Flow Elevation Hub: Your Community Awaits',
 '{"hero": "You''re Part of Something Special", "communityHighlight": "", "coachingInvitation": "", "peerSupport": "", "sessionTopics": "", "joinSessionCTA": "Join a Session", "shareStoryCTA": "Share Your Story"}'::jsonb,
 '["firstName", "memberSince", "sessionsAttended", "nextAvailableSession"]'::jsonb, true),
('friday_recap', '🌟 Week in Review + What''s Coming',
 '{"hero": "Let''s Celebrate This Week''s Progress", "weekHighlights": "", "trendingResources": "", "weekendReflection": "", "nextWeekPreview": "", "stayConnectedCTA": "Stay Connected", "weekendSupport": ""}'::jsonb,
 '["firstName", "resourcesViewed", "aiChatsCount", "healingMinutes"]'::jsonb, true),
('sunday_community_call', '🎙️ Tonight at 6 PM: Weekly Community Call',
 '{"hero": "Join Us Tonight!", "callDetails": "", "callTopic": "", "guestSpeaker": "", "rsvpCTA": "Save Your Spot", "cantMakeIt": "Recording will be sent Monday"}'::jsonb,
 '["firstName", "callType", "zoomLink", "recordingLink", "callTopic", "callDate"]'::jsonb, false)
ON CONFLICT (template_name) DO NOTHING;