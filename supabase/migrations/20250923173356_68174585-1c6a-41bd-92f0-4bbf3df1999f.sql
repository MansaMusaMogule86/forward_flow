-- Update learning content RLS policies to require authentication
-- This addresses the "Educational Content Publicly Exposed" security concern

-- Update learning_pathways policy to require authentication
DROP POLICY IF EXISTS "Authenticated users can view learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Authenticated users can view learning pathways" ON public.learning_pathways; CREATE POLICY "Authenticated users can view learning pathways" ON public.learning_pathways
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update learning_modules policy to require authentication  
DROP POLICY IF EXISTS "Authenticated users can view learning modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Authenticated users can view learning modules" ON public.learning_modules; CREATE POLICY "Authenticated users can view learning modules" ON public.learning_modules  
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add function to check if we have any admin users for initial setup
CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER STABLE 
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role LIMIT 1
  );
END;
$$;