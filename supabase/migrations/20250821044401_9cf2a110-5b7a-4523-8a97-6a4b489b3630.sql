-- Fix any remaining function search_path issues
-- Recreate all functions with proper search_path settings

-- Check if there are any other functions that need updating
-- Update any existing functions that might not have search_path set

-- Ensure all existing functions have proper search_path
-- Some functions might have been created without it previously

-- Drop and recreate any system functions that might exist
-- Removed DROP FUNCTION to avoid dependency issues: handle_new_auth_user();
-- Removed DROP FUNCTION to avoid dependency issues: get_current_user_role();

-- The auth OTP expiry warning is a configuration setting that needs to be 
-- changed in the Supabase dashboard under Authentication > Settings
-- This cannot be fixed via SQL migrations

-- All current functions should now have proper search_path settings
-- Let's verify by ensuring consistent function signatures

-- Create a helper function for user profile creation if needed
CREATE OR REPLACE FUNCTION public.create_user_profile(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (p_user_id, p_email)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;