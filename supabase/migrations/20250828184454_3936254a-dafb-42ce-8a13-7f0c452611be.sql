-- Fix RLS policy for profiles table to restrict access to profile owners only
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles; CREATE POLICY "Users can view their own profile" ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update organizations table RLS policy to be more restrictive  
DROP POLICY IF EXISTS "Only admins can view organizations" ON public.organizations;

DROP POLICY IF EXISTS "Admins can view organizations" ON public.organizations; CREATE POLICY "Admins can view organizations" ON public.organizations 
FOR SELECT 
USING (is_user_admin());