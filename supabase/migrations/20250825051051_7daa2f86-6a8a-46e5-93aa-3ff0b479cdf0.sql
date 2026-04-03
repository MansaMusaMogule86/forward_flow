-- Fix the search path for existing functions to make them more secure
-- This prevents potential SQL injection through search path manipulation

-- Update the is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND role = 'admin'
  );
$function$;

-- Update the can_view_org_contacts function
CREATE OR REPLACE FUNCTION public.can_view_org_contacts()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL;
$function$;

-- Update the create_user_profile function
CREATE OR REPLACE FUNCTION public.create_user_profile(p_user_id uuid, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (p_user_id, p_email)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;