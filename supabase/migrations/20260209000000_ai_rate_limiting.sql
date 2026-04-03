-- AI Rate Limiting System

-- Create AI Rate Limits table
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- user:ID or ip:IP
  endpoint text NOT NULL,   -- The specific AI function being called
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_identifier_created ON public.ai_rate_limits(identifier, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_endpoint ON public.ai_rate_limits(endpoint);

-- Enable RLS
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role access only for inserts/selects from Edge Functions
DROP POLICY IF EXISTS "Service role can manage AI rate limits" ON public.ai_rate_limits; CREATE POLICY "Service role can manage AI rate limits" ON public.ai_rate_limits FOR ALL
  USING (true);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS TABLE (
  is_rate_limited boolean,
  current_count integer
) AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count requests in the window
  SELECT count(*)::integer INTO v_count
  FROM public.ai_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at > now() - (p_window_minutes * interval '1 minute');

  RETURN QUERY
  SELECT
    v_count >= p_max_requests as is_rate_limited,
    v_count as current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
