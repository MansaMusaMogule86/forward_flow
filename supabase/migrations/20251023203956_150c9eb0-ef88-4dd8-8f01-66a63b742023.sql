-- Drop the old function first
-- Removed DROP FUNCTION to avoid dependency issues: public.get_security_metrics_summary();

-- Create updated function with real session tracking
CREATE OR REPLACE FUNCTION public.get_security_metrics_summary()
RETURNS TABLE(
  total_alerts bigint,
  critical_alerts bigint,
  high_alerts bigint,
  unresolved_alerts bigint,
  ai_requests_24h bigint,
  unique_users_24h bigint,
  avg_response_time_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH alert_counts AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical' AND NOT resolved) as critical,
      COUNT(*) FILTER (WHERE severity = 'high' AND NOT resolved) as high,
      COUNT(*) FILTER (WHERE NOT resolved) as unresolved
    FROM security_alerts
  ),
  ai_usage AS (
    SELECT 
      COUNT(*) as requests_24h,
      COUNT(DISTINCT COALESCE(user_id::text, session_id)) as unique_users_24h
    FROM ai_trial_sessions
    WHERE created_at > NOW() - INTERVAL '24 hours'
  ),
  analytics_data AS (
    SELECT 
      COALESCE(
        AVG(
          CASE 
            WHEN event_data->>'response_time_ms' IS NOT NULL 
            THEN (event_data->>'response_time_ms')::numeric
            ELSE NULL
          END
        ), 
        0
      ) as avg_response
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND event_data->>'response_time_ms' IS NOT NULL
  )
  SELECT 
    ac.total::bigint,
    ac.critical::bigint,
    ac.high::bigint,
    ac.unresolved::bigint,
    au.requests_24h::bigint,
    au.unique_users_24h::bigint,
    ROUND(ad.avg_response::numeric, 2)
  FROM alert_counts ac
  CROSS JOIN ai_usage au
  CROSS JOIN analytics_data ad;
END;
$$;