-- 1) Create roles enum and table, plus helper function
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2) Replace hardcoded admin list with roles-based check
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin'::public.app_role);
$$;

-- 3) Safe helper to fetch current user email without exposing auth.users in RLS
CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id;
$$;

-- 4) Update RLS policies that directly queried auth.users
-- otp_codes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND p_table_name = 'otp_codes') THEN
    DROP POLICY IF EXISTS "Users can create OTP codes for their own email" ON public.otp_codes;
    DROP POLICY IF EXISTS "Users can update their own OTP codes" ON public.otp_codes;
    DROP POLICY IF EXISTS "Users can view their own OTP codes" ON public.otp_codes;

    DROP POLICY IF EXISTS "Users can create OTP codes for their own email" ON public.otp_codes; CREATE POLICY "Users can create OTP codes for their own email" ON public.otp_codes
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (email = public.get_user_email(auth.uid()));

    DROP POLICY IF EXISTS "Users can update their own OTP codes" ON public.otp_codes; CREATE POLICY "Users can update their own OTP codes" ON public.otp_codes
    AS PERMISSIVE
    FOR UPDATE
    TO authenticated
    USING (email = public.get_user_email(auth.uid()))
    WITH CHECK (email = public.get_user_email(auth.uid()));

    DROP POLICY IF EXISTS "Users can view their own OTP codes" ON public.otp_codes; CREATE POLICY "Users can view their own OTP codes" ON public.otp_codes
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (email = public.get_user_email(auth.uid()));
  END IF;
END $$;

-- user_access
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND p_table_name = 'user_access') THEN
    DROP POLICY IF EXISTS "user_access_select_owner_or_admin" ON public.user_access;
    DROP POLICY IF EXISTS "user_access_insert_all" ON public.user_access;

    DROP POLICY IF EXISTS "user_access_select_owner_or_admin" ON public.user_access; CREATE POLICY "user_access_select_owner_or_admin" ON public.user_access
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (
      email = public.get_user_email(auth.uid())
      OR public.is_user_admin(auth.uid())
    );

    DROP POLICY IF EXISTS "user_access_insert_admin" ON public.user_access; CREATE POLICY "user_access_insert_admin" ON public.user_access
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_user_admin(auth.uid()));
  END IF;
END $$;

-- 5) Tighten orders INSERT policy
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND p_table_name = 'orders') THEN
    DROP POLICY IF EXISTS "orders_insert_all" ON public.orders;

    DROP POLICY IF EXISTS "orders_insert_owner_or_server" ON public.orders; CREATE POLICY "orders_insert_owner_or_server" ON public.orders
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));
  END IF;
END $$;
