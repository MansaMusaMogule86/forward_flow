-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a restricted policy that only allows users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles; CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);