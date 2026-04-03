-- Create email_events table for tracking deliverability metrics
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL, -- Resend email ID
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- delivered, opened, clicked, bounced, complained
  email_type TEXT, -- contact, newsletter, reminder, verification, etc.
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_email_events_email_id ON public.email_events(email_id);
CREATE INDEX idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_email_type ON public.email_events(email_type);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view email events
DROP POLICY IF EXISTS "Admins can view email events" ON public.email_events; CREATE POLICY "Admins can view email events" ON public.email_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_email_events_updated_at ON public.email_events; CREATE TRIGGER update_email_events_updated_at BEFORE UPDATE ON public.email_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add email tracking fields to contact_submissions
ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending'; -- pending, sent, delivered, failed

COMMENT ON TABLE public.email_events IS 'Tracks email deliverability metrics from Resend webhooks';
COMMENT ON COLUMN public.email_events.event_type IS 'Email event type: delivered, opened, clicked, bounced, complained';
COMMENT ON COLUMN public.email_events.email_type IS 'Category of email: contact, newsletter, reminder, verification, etc.';