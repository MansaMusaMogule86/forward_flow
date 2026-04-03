-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,        
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create states table
CREATE TABLE IF NOT EXISTS public.states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  coming_soon BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT NOT NULL,
  county TEXT NOT NULL,
  state_code TEXT NOT NULL,
  type TEXT NOT NULL,
  verified TEXT NOT NULL DEFAULT 'community',
  justice_friendly BOOLEAN NOT NULL DEFAULT false,
  rating DECIMAL(2,1) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learning pathways table
CREATE TABLE IF NOT EXISTS public.learning_pathways (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  free BOOLEAN NOT NULL DEFAULT true,
  educational_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learning modules table
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathway_id TEXT REFERENCES public.learning_pathways(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  minutes INTEGER,
  link TEXT,
  compliance_note TEXT,
  tags TEXT[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user learning progress table
CREATE TABLE IF NOT EXISTS public.user_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state_code TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles; CREATE POLICY "Users can view all profiles" ON public.profiles 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles; CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- States policies (public read access)
DROP POLICY IF EXISTS "Anyone can view states" ON public.states;
DROP POLICY IF EXISTS "Anyone can view states" ON public.states; CREATE POLICY "Anyone can view states" ON public.states 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage states" ON public.states;
DROP POLICY IF EXISTS "Admins can manage states" ON public.states; CREATE POLICY "Admins can manage states" ON public.states 
FOR ALL 
USING (is_user_admin());

-- Resources policies (public read access)
DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;
DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources; CREATE POLICY "Anyone can view resources" ON public.resources 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources; CREATE POLICY "Admins can manage resources" ON public.resources 
FOR ALL 
USING (is_user_admin());

-- Learning pathways policies (public read access)
DROP POLICY IF EXISTS "Anyone can view learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Anyone can view learning pathways" ON public.learning_pathways; CREATE POLICY "Anyone can view learning pathways" ON public.learning_pathways 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Admins can manage learning pathways" ON public.learning_pathways; CREATE POLICY "Admins can manage learning pathways" ON public.learning_pathways 
FOR ALL 
USING (is_user_admin());

-- Learning modules policies (public read access)
DROP POLICY IF EXISTS "Anyone can view learning modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Anyone can view learning modules" ON public.learning_modules; CREATE POLICY "Anyone can view learning modules" ON public.learning_modules 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage learning modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Admins can manage learning modules" ON public.learning_modules; CREATE POLICY "Admins can manage learning modules" ON public.learning_modules 
FOR ALL 
USING (is_user_admin());

-- User learning progress policies
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_learning_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_learning_progress; CREATE POLICY "Users can view their own progress" ON public.user_learning_progress 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.user_learning_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.user_learning_progress; CREATE POLICY "Users can manage their own progress" ON public.user_learning_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_learning_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_learning_progress; CREATE POLICY "Users can update their own progress" ON public.user_learning_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_learning_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_learning_progress; CREATE POLICY "Admins can view all progress" ON public.user_learning_progress 
FOR SELECT 
USING (is_user_admin());

-- Organizations policies (public read access)
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations; CREATE POLICY "Anyone can view organizations" ON public.organizations 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations; CREATE POLICY "Admins can manage organizations" ON public.organizations 
FOR ALL 
USING (is_user_admin());

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles; CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources; CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_pathways_updated_at ON public.learning_pathways;
DROP TRIGGER IF EXISTS update_learning_pathways_updated_at ON public.learning_pathways; CREATE TRIGGER update_learning_pathways_updated_at BEFORE UPDATE ON public.learning_pathways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_modules_updated_at ON public.learning_modules;
DROP TRIGGER IF EXISTS update_learning_modules_updated_at ON public.learning_modules; CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON public.learning_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_learning_progress_updated_at ON public.user_learning_progress;
DROP TRIGGER IF EXISTS update_user_learning_progress_updated_at ON public.user_learning_progress; CREATE TRIGGER update_user_learning_progress_updated_at BEFORE UPDATE ON public.user_learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations; CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial states data
INSERT INTO public.states (code, name, active, coming_soon) VALUES
('OH', 'Ohio', true, false),
('TX', 'Texas', false, true),
('CA', 'California', false, true),
('FL', 'Florida', false, true),
('PA', 'Pennsylvania', false, true),
('IL', 'Illinois', false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample learning pathways and modules
INSERT INTO public.learning_pathways (id, title, description, category, free, educational_only) VALUES
('financial', 'Understand Your Money: Free Financial Education', 'Educational-only modules to build confidence with credit, budgeting, and financial systems.', 'Financial Literacy & Credit Education', true, true),
('wellness', 'Heal & Thrive: Free Wellness Education & Resources', 'Trauma‑informed mental health education to support healing and resilience.', 'Mindfulness & Wellness', true, true),
('business', 'Build Your Future: Free Business Education & Resources', 'Foundational business education with referrals for professional guidance.', 'Business & Entrepreneurship', true, true),
('life-skills', 'Navigate Life: Free Essential Skills Education', 'Everyday skills for confidence with tech, communication, and organization.', 'Life Skills & Digital Literacy', true, true),
('career', 'Get Ready to Work: Free Career Preparation', 'Career exploration and job readiness learning for next‑step confidence.', 'Job Readiness & Career', true, true)
ON CONFLICT (id) DO NOTHING;