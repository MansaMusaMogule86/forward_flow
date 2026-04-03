-- Email automation rules configuration
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL, -- signup, milestone, inactivity
  enabled BOOLEAN DEFAULT true,
  delay_minutes INTEGER DEFAULT 0, -- Delay before sending
  email_subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  conditions JSONB, -- Additional conditions (e.g., milestone_type: 'first_module')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email automation queue for scheduled sends
CREATE TABLE IF NOT EXISTS public.email_automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.email_automation_rules(id) ON DELETE CASCADE,
  trigger_data JSONB, -- Context data for template
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_automation_queue_scheduled ON public.email_automation_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_automation_queue_user ON public.email_automation_queue(user_id);
CREATE INDEX idx_automation_queue_status ON public.email_automation_queue(status);
CREATE INDEX idx_automation_rules_trigger ON public.email_automation_rules(trigger_type) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_queue ENABLE ROW LEVEL SECURITY;

-- Admins can manage automation rules
DROP POLICY IF EXISTS "Admins can manage automation rules" ON public.email_automation_rules; CREATE POLICY "Admins can manage automation rules" ON public.email_automation_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own queue items
DROP POLICY IF EXISTS "Users can view their queue items" ON public.email_automation_queue; CREATE POLICY "Users can view their queue items" ON public.email_automation_queue
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all queue items
DROP POLICY IF EXISTS "Admins can manage queue" ON public.email_automation_queue; CREATE POLICY "Admins can manage queue" ON public.email_automation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_email_automation_rules_updated_at ON public.email_automation_rules; CREATE TRIGGER update_email_automation_rules_updated_at BEFORE UPDATE ON public.email_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_automation_queue_updated_at ON public.email_automation_queue; CREATE TRIGGER update_email_automation_queue_updated_at BEFORE UPDATE ON public.email_automation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to queue automation email
CREATE OR REPLACE FUNCTION public.queue_automation_email(
  p_user_id UUID,
  p_rule_name TEXT,
  p_trigger_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_id UUID;
  v_delay_minutes INTEGER;
  v_scheduled_for TIMESTAMPTZ;
  v_queue_id UUID;
BEGIN
  -- Get the rule
  SELECT id, delay_minutes INTO v_rule_id, v_delay_minutes
  FROM email_automation_rules
  WHERE rule_name = p_rule_name AND enabled = true;

  -- If rule not found or disabled, return null
  IF v_rule_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate scheduled time
  v_scheduled_for := NOW() + (v_delay_minutes || ' minutes')::INTERVAL;

  -- Insert into queue
  INSERT INTO email_automation_queue (
    user_id,
    rule_id,
    trigger_data,
    scheduled_for,
    status
  ) VALUES (
    p_user_id,
    v_rule_id,
    p_trigger_data,
    v_scheduled_for,
    'pending'
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Trigger on new user signup
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Queue welcome email 5 minutes after signup
  PERFORM queue_automation_email(
    NEW.id,
    'welcome_series',
    jsonb_build_object(
      'email', NEW.email,
      'name', COALESCE(NEW.full_name, 'there')
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();

-- Trigger on milestone completion
CREATE OR REPLACE FUNCTION public.trigger_milestone_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  -- Only trigger on completion
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    -- Get user info
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM profiles WHERE id = NEW.user_id;
    
    -- Queue milestone email
    PERFORM queue_automation_email(
      NEW.user_id,
      'milestone_completed',
      jsonb_build_object(
        'email', v_user_email,
        'name', COALESCE(v_user_name, 'there'),
        'module_id', NEW.module_id,
        'pathway_id', NEW.pathway_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_learning_progress_milestone ON public.learning_progress; CREATE TRIGGER on_learning_progress_milestone AFTER UPDATE ON public.learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_milestone_email();

-- Insert default automation rules
INSERT INTO public.email_automation_rules (rule_name, trigger_type, delay_minutes, email_subject, email_type, enabled) VALUES
  ('welcome_series', 'signup', 5, 'Welcome to Forward Focus Elevation!', 'welcome', true),
  ('milestone_completed', 'milestone', 0, 'Congratulations on Your Milestone! 🎉', 'milestone', true),
  ('inactivity_7days', 'inactivity', 0, 'We miss you! Come back and continue your journey', 'inactivity', true)
ON CONFLICT (rule_name) DO NOTHING;

COMMENT ON TABLE public.email_automation_rules IS 'Configuration for automated email triggers';
COMMENT ON TABLE public.email_automation_queue IS 'Queue of scheduled automated emails to be sent';
COMMENT ON FUNCTION public.queue_automation_email IS 'Adds an email to the automation queue based on rule configuration';