/**
 * AI Rate Limiting Utility
 * Protects our API costs while allowing high limits for authenticated members.
 */

export const GUEST_MAX_REQUESTS = 5;
export const AUTHED_MAX_REQUESTS = 50;
export const RATE_LIMIT_WINDOW_MINUTES = 1440; // 24 hours

const ENDPOINT_LIMIT_OVERRIDES: Record<string, {
  guestMaxRequests: number;
  authedMaxRequests: number;
  windowMinutes: number;
}> = {
  // Safety endpoints should not hard-lock users after a handful of attempts.
  'reentry-navigator-ai': { guestMaxRequests: 30, authedMaxRequests: 150, windowMinutes: 60 },
  'victim-support-ai': { guestMaxRequests: 30, authedMaxRequests: 150, windowMinutes: 60 },
  'crisis-support-ai': { guestMaxRequests: 30, authedMaxRequests: 150, windowMinutes: 60 },
  'crisis-emergency-ai': { guestMaxRequests: 60, authedMaxRequests: 300, windowMinutes: 60 },
};

export interface RateLimitResult {
  limited: boolean;
  identifier: string;
  maxRequests: number;
  remaining: number;
  message?: string;
}

export async function checkAiRateLimit(
  supabase: any,
  req: Request,
  endpoint: string
): Promise<RateLimitResult> {
  const endpointLimits = ENDPOINT_LIMIT_OVERRIDES[endpoint];
  const windowMinutes = endpointLimits?.windowMinutes ?? RATE_LIMIT_WINDOW_MINUTES;

  // Extract user IP or fallback to unknown
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  let identifier = `ip:${ip}`;
  let maxRequests = endpointLimits?.guestMaxRequests ?? GUEST_MAX_REQUESTS;

  // Try to authenticate the user for higher limits
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        identifier = `user:${user.id}`;
        maxRequests = endpointLimits?.authedMaxRequests ?? AUTHED_MAX_REQUESTS;
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
    p_window_minutes: windowMinutes
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

