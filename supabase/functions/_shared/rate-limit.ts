/**
 * AI Rate Limiting Utility
 * Protects our API costs while allowing high limits for authenticated members.
 */

export const GUEST_MAX_REQUESTS = 5;
export const AUTHED_MAX_REQUESTS = 50;
export const RATE_LIMIT_WINDOW_MINUTES = 1440; // 24 hours

export interface RateLimitResult {
  limited: boolean;
  identifier: string;
  maxRequests: number;
  remaining: number;
}

export async function checkAiRateLimit(
  supabase: any,
  req: Request,
  endpoint: string
): Promise<RateLimitResult> {
  // Extract user IP or fallback to unknown
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  let identifier = `ip:${ip}`;
  let maxRequests = GUEST_MAX_REQUESTS;

  // Try to authenticate the user for higher limits
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        identifier = `user:${user.id}`;
        maxRequests = AUTHED_MAX_REQUESTS;
      }
    } catch (e) {
      console.warn('Silent failure in rate-limit auth check:', e);
    }
  }

  // Check limits using database RPC
  const { data, error } = await supabase.rpc('check_ai_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
  });

  if (error) {
    console.error(`Rate limit database error for ${identifier}:`, error);
    // On DB error, fail-open to not block users, but log it
    return { limited: false, identifier, maxRequests, remaining: maxRequests };
  }

  // Result from the TABLE return type of the RPC
  const result = data?.[0] || { is_rate_limited: false, current_count: 0 };

  if (!result.is_rate_limited) {
    // Record the current successful request
    const { error: insertError } = await supabase.from('ai_rate_limits').insert({
      identifier,
      endpoint
    });

    if (insertError) {
      console.error('Failed to record AI request in audit log:', insertError);
    }
  } else {
    console.warn(`Rate limit triggered for ${identifier} on endpoint ${endpoint}`);
  }

  return {
    limited: result.is_rate_limited,
    identifier,
    maxRequests,
    remaining: Math.max(0, maxRequests - result.current_count - 1)
  };
}

