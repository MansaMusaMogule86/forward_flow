-- Fix RLS policy for profiles table to restrict access to profile owners only
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles; -- Removed illegal policy on view;