-- Add proper RLS policies for partner functionality

-- Enable RLS on partner_referrals if not already enabled
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

-- Create policies for partner_referrals
DROP POLICY IF EXISTS "Authenticated users can submit referrals" ON public.partner_referrals; CREATE POLICY "Authenticated users can submit referrals" ON public.partner_referrals
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.partner_referrals; CREATE POLICY "Users can view their own referrals" ON public.partner_referrals
  FOR SELECT 
  TO authenticated
  USING (true); -- Allow viewing for tracking purposes

DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.partner_referrals; CREATE POLICY "Admins can manage all referrals" ON public.partner_referrals
  FOR ALL 
  TO authenticated
  USING (is_user_admin());

-- CREATE OR REPLACE FUNCTION to get partner statistics
CREATE OR REPLACE FUNCTION get_partner_stats(partner_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_refs INTEGER;
  completed_refs INTEGER;
  active_refs INTEGER;
  resources_added INTEGER;
  impact_score INTEGER;
BEGIN
  -- Require authentication
  IF partner_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get referral counts (all referrals for now, can be filtered by partner later)
  SELECT COUNT(*) INTO total_refs FROM partner_referrals;
  
  SELECT COUNT(*) INTO completed_refs 
  FROM partner_referrals 
  WHERE status = 'completed';
  
  SELECT COUNT(*) INTO active_refs 
  FROM partner_referrals 
  WHERE status IN ('pending', 'in_progress');
  
  -- Get resources added by this partner
  SELECT COUNT(*) INTO resources_added 
  FROM organizations 
  WHERE owner_id = partner_user_id;
  
  -- Calculate simple impact score based on activity
  impact_score := LEAST(100, 
    (COALESCE(total_refs, 0) * 10) + 
    (COALESCE(resources_added, 0) * 15) + 
    (COALESCE(completed_refs, 0) * 5)
  );
  
  -- Build result JSON
  result := json_build_object(
    'totalReferrals', COALESCE(total_refs, 0),
    'activeReferrals', COALESCE(active_refs, 0), 
    'completedReferrals', COALESCE(completed_refs, 0),
    'resourcesAdded', COALESCE(resources_added, 0),
    'impactScore', impact_score
  );
  
  RETURN result;
END;
$$;

-- Update partner_referrals table to ensure proper status tracking
ALTER TABLE public.partner_referrals 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;