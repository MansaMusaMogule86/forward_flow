DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND p_table_name = 'credit_transactions') THEN
    -- Harden SELECT access on credit_transactions
    -- Ensure only the authenticated user matching BOTH user_id and email can read their records
    ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

    -- Replace existing user SELECT policy with stricter dual-binding (user_id AND email)
    DROP POLICY IF EXISTS "credit_tx_select_own" ON public.credit_transactions;
    DROP POLICY IF EXISTS "credit_tx_select_strict_own" ON public.credit_transactions; CREATE POLICY "credit_tx_select_strict_own" ON public.credit_transactions
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
      AND email = public.get_user_email(auth.uid())
    );

    -- Optional: allow admins to audit if needed (keeps user access strict while enabling admin oversight)
    DROP POLICY IF EXISTS "credit_tx_select_admin" ON public.credit_transactions;
    DROP POLICY IF EXISTS "credit_tx_select_admin" ON public.credit_transactions; CREATE POLICY "credit_tx_select_admin" ON public.credit_transactions
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (public.is_user_admin(auth.uid()));
  END IF;
END $$;