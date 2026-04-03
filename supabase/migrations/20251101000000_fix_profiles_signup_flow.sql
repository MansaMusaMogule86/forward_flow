
-- Drop dependent policies first
DROP POLICY IF EXISTS profiles_authenticated_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_authenticated_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_authenticated_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_deny_unauthenticated ON public.profiles;

-- Fix profiles table structure to match application expectations and signup flow
DO $$ 
BEGIN
    -- Rename display_name to full_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE public.profiles RENAME COLUMN display_name TO full_name;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;

    -- Clean up redundant/unused columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles DROP COLUMN bio;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.profiles DROP COLUMN user_id;
    END IF;
END $$;

-- Ensure id is properly linked to auth.users and has no random default
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;

-- Since table is empty, we can safely set email NOT NULL
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Ensure foreign key from profiles.id to auth.users.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Recreate policies using id (which refers to auth.users.id)
CREATE POLICY profiles_authenticated_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_authenticated_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_authenticated_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_deny_unauthenticated ON public.profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix the handle_new_user function with robust logic and conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', '')
  ) ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN new;
END;
$$;

-- Ensure the trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS just in case it was disabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
