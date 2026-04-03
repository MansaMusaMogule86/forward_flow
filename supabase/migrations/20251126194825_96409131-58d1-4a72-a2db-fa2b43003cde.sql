-- Consolidate duplicate timestamp trigger functions
-- First, update all triggers to use the unified function
DROP TRIGGER IF EXISTS email_preferences_updated_at ON public.email_preferences;
DROP TRIGGER IF EXISTS email_preferences_updated_at ON public.email_preferences; CREATE TRIGGER email_preferences_updated_at BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates; CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS email_send_queue_updated_at ON public.email_send_queue;
DROP TRIGGER IF EXISTS email_send_queue_updated_at ON public.email_send_queue; CREATE TRIGGER email_send_queue_updated_at BEFORE UPDATE ON public.email_send_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS email_campaign_settings_updated_at ON public.email_campaign_settings;
DROP TRIGGER IF EXISTS email_campaign_settings_updated_at ON public.email_campaign_settings; CREATE TRIGGER email_campaign_settings_updated_at BEFORE UPDATE ON public.email_campaign_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Now drop the duplicate function (nothing depends on it anymore)
-- Removed DROP FUNCTION to avoid dependency issues: public.update_email_updated_at();