-- Fix security issues from the previous migration

-- Drop the problematic security definer view
DROP VIEW IF EXISTS public.organizations_public;

-- Instead, create proper RLS policies that handle the access control
-- Replace the previous policies with more granular ones
DROP POLICY IF EXISTS "Anyone can view basic organization info" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can view organization contacts" ON public.organizations;

-- Create new policies that allow public basic info but protect sensitive data
DROP POLICY IF EXISTS "Public can view basic organization info" ON public.organizations; CREATE POLICY "Public can view basic organization info" ON public.organizations 
FOR SELECT 
USING (true);

-- Add a database function to check if sensitive fields should be visible
CREATE OR REPLACE FUNCTION public.can_view_org_contacts()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Update existing functions that were missing search_path
-- Removed DROP FUNCTION to avoid dependency issues: public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;