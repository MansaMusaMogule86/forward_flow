-- Emergency fix for "Customer Payment Data Could Be Stolen" security issue
-- Lock down payments table completely with restrictive RLS policies

-- Block all INSERT p_actions except for admin/system functions
DROP POLICY IF EXISTS "Block all payment inserts - admin functions only" ON public.payments; CREATE POLICY "Block all payment inserts - admin functions only" ON public.payments 
FOR INSERT 
WITH CHECK (false);

-- Block all UPDATE p_actions except for admin/system functions  
DROP POLICY IF EXISTS "Block all payment updates - admin functions only" ON public.payments; CREATE POLICY "Block all payment updates - admin functions only" ON public.payments 
FOR UPDATE 
USING (false)
WITH CHECK (false);

-- Block all DELETE p_actions completely (payments should never be deleted)
DROP POLICY IF EXISTS "Block all payment deletions - never allow" ON public.payments; CREATE POLICY "Block all payment deletions - never allow" ON public.payments 
FOR DELETE 
USING (false);

-- Add emergency admin access for payment management when needed
DROP POLICY IF EXISTS "Emergency admin payment access" ON public.payments; CREATE POLICY "Emergency admin payment access" ON public.payments 
FOR ALL
USING (is_user_admin(auth.uid()) AND emergency_data_access_check())
WITH CHECK (is_user_admin(auth.uid()) AND emergency_data_access_check());

-- Create secure payment creation function for controlled access
CREATE OR REPLACE FUNCTION public.create_payment_secure(
  p_user_id UUID,
  p_amount NUMERIC,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id UUID;
BEGIN
  -- Require admin privileges for payment creation
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required for payment creation';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  
  -- Create payment record
  INSERT INTO public.payments (user_id, amount, status)
  VALUES (p_user_id, p_amount, p_status)
  RETURNING id INTO payment_id ON CONFLICT DO NOTHING;
  
  -- Log the payment creation
  PERFORM log_payment_p_action('CREATE', payment_id, (p_amount * 100)::integer);
  
  RETURN payment_id;
END;
$$;

-- Create secure payment update function for controlled access
CREATE OR REPLACE FUNCTION public.update_payment_status_secure(
  p_payment_id UUID,
  p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require admin privileges for payment updates
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required for payment updates';
  END IF;
  
  -- Validate status
  IF p_new_status NOT IN ('pending', 'completed', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;
  
  -- Update payment status
  UPDATE public.payments
  SET status = p_new_status
  WHERE id = p_payment_id;
  
  -- Log the payment update
  PERFORM log_payment_p_action('UPDATE_STATUS', p_payment_id);
END;
$$;