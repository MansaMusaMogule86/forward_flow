-- Security Hardening Migration
-- 1) Ensure RLS on user_roles and add strict policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles; CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_user_admin(auth.uid())
);

DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles; CREATE POLICY "user_roles_insert_admin" ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles; CREATE POLICY "user_roles_update_admin" ON public.user_roles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles; CREATE POLICY "user_roles_delete_admin" ON public.user_roles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- 2) Create self-scoped RPCs and revoke unsafe ones
-- 2a) Start tool trial (self)
CREATE OR REPLACE FUNCTION public.start_tool_trial_self(p_tool_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_id UUID;
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.get_user_email(v_user_id) INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Email not found for user';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    email,
    tool_name,
    plan_type,
    status,
    price,
    trial_start_date,
    trial_end_date
  ) VALUES (
    v_user_id,
    v_email,
    p_tool_name,
    'trial',
    'active',
    0.00,
    now(),
    now() + interval '8 days'
  ) RETURNING id INTO subscription_id ON CONFLICT DO NOTHING;
  RETURN subscription_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_tool_trial(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_tool_trial_self(text) TO authenticated;

-- 2b) Check active tool subscription (self)
CREATE OR REPLACE FUNCTION public.has_active_tool_subscription_self(p_tool_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = v_user_id 
    AND tool_name = p_tool_name
    AND status = 'active'
    AND (
      (plan_type = 'trial' AND trial_end_date > now()) OR
      (plan_type != 'trial' AND subscription_end_date > now())
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_tool_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_tool_subscription_self(text) TO authenticated;

-- 2c) Trials: self-only helpers and revoke email-parameterized versions for clients
CREATE OR REPLACE FUNCTION public.start_trial_self()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT public.get_user_email(v_user_id) INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Email not found';
  END IF;

  INSERT INTO public.trials (email)
  VALUES (v_email)
  ON CONFLICT (email) DO UPDATE SET
    started_at = now(),
    expires_at = now() + interval '3 days' ON CONFLICT DO NOTHING;
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_trial(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_trial_self() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_trial_active_self()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT public.get_user_email(v_user_id) INTO v_email;
  RETURN EXISTS (
    SELECT 1 FROM public.trials
    WHERE email = v_email
      AND expires_at > now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_trial_active(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_trial_active_self() TO authenticated;