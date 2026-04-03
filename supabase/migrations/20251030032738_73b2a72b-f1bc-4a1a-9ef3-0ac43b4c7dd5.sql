-- Add INSERT policy for profiles so new users can create their profile rows
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Create policy only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can create own profile'
  ) THEN
    DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles; CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;