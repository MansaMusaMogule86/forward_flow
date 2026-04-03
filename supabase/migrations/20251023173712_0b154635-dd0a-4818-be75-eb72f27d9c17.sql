-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Function to check admin p_action rate limits
CREATE OR REPLACE FUNCTION public.check_admin_p_action_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_action_count integer;
  time_window interval := '1 minute';
  max_p_actions integer := 30;
BEGIN
  -- Count p_actions in the last minute for this admin
  SELECT COUNT(*) INTO p_action_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND created_at > (now() - time_window)
    AND severity = 'info';
  
  -- Return true if under limit, false if over
  RETURN p_action_count < max_p_actions;
END;
$$;

-- Function to get partner statistics
CREATE OR REPLACE FUNCTION public.get_partner_stats()
RETURNS TABLE (
  total_partners bigint,
  verified_partners bigint,
  pending_partners bigint,
  total_referrals bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(DISTINCT p.id) as total_partners,
    COUNT(DISTINCT p.id) FILTER (WHERE p.verified = true) as verified_partners,
    COUNT(DISTINCT p.id) FILTER (WHERE p.verification_status = 'pending') as pending_partners,
    COUNT(pr.id) as total_referrals
  FROM public.partners p
  LEFT JOIN public.partner_referrals pr ON p.id = pr.partner_id;
$$;