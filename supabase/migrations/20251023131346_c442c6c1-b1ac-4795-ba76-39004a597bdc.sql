-- Create ai_trial_sessions table for tracking AI feature trials
CREATE TABLE IF NOT EXISTS public.ai_trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_endpoint TEXT NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_trial_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_trial_sessions_session_id ON public.ai_trial_sessions(session_id);
CREATE INDEX idx_ai_trial_sessions_user_id ON public.ai_trial_sessions(user_id);

-- Create support_requests table for various support forms
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'ai_consultation', 'corporate_training', 'grant_inquiry', 'speaker_application'
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  request_data JSONB, -- Additional structured data specific to request type
  status TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_support_requests_user_id ON public.support_requests(user_id);
CREATE INDEX idx_support_requests_type ON public.support_requests(request_type);
CREATE INDEX idx_support_requests_status ON public.support_requests(status);

-- Create bookings table for consultations/appointments
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_type TEXT NOT NULL, -- 'consultation', 'coaching_session', etc.
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_scheduled_date ON public.bookings(scheduled_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Create community_applications table
CREATE TABLE IF NOT EXISTS public.community_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pathway_id TEXT NOT NULL,
  application_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.community_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_community_applications_user_id ON public.community_applications(user_id);
CREATE INDEX idx_community_applications_pathway_id ON public.community_applications(pathway_id);
CREATE INDEX idx_community_applications_status ON public.community_applications(status);

-- Create healing_sessions table for tracking healing toolkit usage
CREATE TABLE IF NOT EXISTS public.healing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL, -- 'breathing', 'frequency', 'meditation', etc.
  duration_seconds INTEGER,
  session_data JSONB, -- Additional data like frequency used, completion rate, etc.
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.healing_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_healing_sessions_user_id ON public.healing_sessions(user_id);
CREATE INDEX idx_healing_sessions_type ON public.healing_sessions(session_type);
CREATE INDEX idx_healing_sessions_created_at ON public.healing_sessions(created_at DESC);

-- Create audit_logs table for security auditing
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);

-- Create security_alerts table for monitoring suspicious activity
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  alert_data JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_acknowledged ON public.security_alerts(acknowledged);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);

-- Create user_sessions table for session tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);

-- Create emergency_contacts table for crisis support
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL, -- 'crisis', 'domestic_violence', 'substance_abuse', etc.
  state TEXT,
  city TEXT,
  description TEXT,
  available_24_7 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_emergency_contacts_category ON public.emergency_contacts(category);
CREATE INDEX idx_emergency_contacts_state ON public.emergency_contacts(state);

-- Create chat_history table for AI chat conversations
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ai_endpoint TEXT NOT NULL,
  message_role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  message_content TEXT NOT NULL,
  message_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON public.chat_history(session_id);
CREATE INDEX idx_chat_history_created_at ON public.chat_history(created_at DESC);

-- Add update triggers for new tables
DROP TRIGGER IF EXISTS update_ai_trial_sessions_updated_at ON public.ai_trial_sessions; CREATE TRIGGER update_ai_trial_sessions_updated_at BEFORE UPDATE ON public.ai_trial_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_requests_updated_at ON public.support_requests; CREATE TRIGGER update_support_requests_updated_at BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings; CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_applications_updated_at ON public.community_applications; CREATE TRIGGER update_community_applications_updated_at BEFORE UPDATE ON public.community_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts; CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for ai_trial_sessions
DROP POLICY IF EXISTS "Users can view own trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Users can view own trial sessions" ON public.ai_trial_sessions
  FOR SELECT USING (user_id = auth.uid() OR session_id IN (
    SELECT COALESCE(current_setting('app.session_id', true), '')
  ));

DROP POLICY IF EXISTS "Anyone can create trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Anyone can create trial sessions" ON public.ai_trial_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own trial sessions" ON public.ai_trial_sessions; CREATE POLICY "Users can update own trial sessions" ON public.ai_trial_sessions
  FOR UPDATE USING (user_id = auth.uid() OR session_id IN (
    SELECT COALESCE(current_setting('app.session_id', true), '')
  ));

-- RLS Policies for support_requests
DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests; CREATE POLICY "Users can view own support requests" ON public.support_requests
  FOR SELECT USING (user_id = auth.uid() OR email = (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can create support requests" ON public.support_requests; CREATE POLICY "Anyone can create support requests" ON public.support_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update support requests" ON public.support_requests; CREATE POLICY "Admins can update support requests" ON public.support_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings; CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings; CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings; CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings; CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for community_applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.community_applications; CREATE POLICY "Users can view own applications" ON public.community_applications
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.community_applications; CREATE POLICY "Authenticated users can create applications" ON public.community_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update applications" ON public.community_applications; CREATE POLICY "Admins can update applications" ON public.community_applications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for healing_sessions
DROP POLICY IF EXISTS "Users can view own healing sessions" ON public.healing_sessions; CREATE POLICY "Users can view own healing sessions" ON public.healing_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own healing sessions" ON public.healing_sessions; CREATE POLICY "Users can create own healing sessions" ON public.healing_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs; CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs; CREATE POLICY "System can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for security_alerts
DROP POLICY IF EXISTS "Admins can view all security alerts" ON public.security_alerts; CREATE POLICY "Admins can view all security alerts" ON public.security_alerts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can create security alerts" ON public.security_alerts; CREATE POLICY "System can create security alerts" ON public.security_alerts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update security alerts" ON public.security_alerts; CREATE POLICY "Admins can update security alerts" ON public.security_alerts
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions; CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can create sessions" ON public.user_sessions; CREATE POLICY "System can create sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions; CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions; CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for emergency_contacts
DROP POLICY IF EXISTS "Anyone can view emergency contacts" ON public.emergency_contacts; CREATE POLICY "Anyone can view emergency contacts" ON public.emergency_contacts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage emergency contacts" ON public.emergency_contacts; CREATE POLICY "Admins can manage emergency contacts" ON public.emergency_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_history
DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history; CREATE POLICY "Users can view own chat history" ON public.chat_history
  FOR SELECT USING (user_id = auth.uid() OR session_id IN (
    SELECT COALESCE(current_setting('app.session_id', true), '')
  ));

DROP POLICY IF EXISTS "Anyone can create chat history" ON public.chat_history; CREATE POLICY "Anyone can create chat history" ON public.chat_history
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own chat history" ON public.chat_history; CREATE POLICY "Users can delete own chat history" ON public.chat_history
  FOR DELETE USING (user_id = auth.uid());