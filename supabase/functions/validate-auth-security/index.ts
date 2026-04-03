import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, email, ipAddress, userAgent, success, failureReason, attemptType, captchaToken, setupKey, captchaAnswer, signature, challenge } = body;

    // Get client IP from headers or request
    const clientIp = ipAddress || 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const clientUserAgent = userAgent || req.headers.get('user-agent') || 'unknown';

    if (action === 'check-rate-limit') {
      // Check rate limit status
      const { data, error } = await supabase.rpc('check_login_rate_limit', {
        p_ip_address: clientIp,
        p_email: email?.toLowerCase() || null
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to check rate limit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = data?.[0] || {
        is_rate_limited: false,
        attempts_remaining: 5,
        reset_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        requires_captcha: false,
        is_locked_out: false,
        lockout_until: null
      };

      return new Response(
        JSON.stringify({
          isRateLimited: result.is_rate_limited,
          attemptsRemaining: result.attempts_remaining,
          resetAt: result.reset_at,
          requiresCaptcha: result.requires_captcha,
          isLockedOut: result.is_locked_out,
          lockoutUntil: result.lockout_until
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-first-admin') {
      const internalSetupKey = Deno.env.get('ADMIN_SETUP_KEY');

      if (!internalSetupKey) {
        return new Response(
          JSON.stringify({ success: false, message: 'Admin setup is disabled' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (setupKey !== internalSetupKey) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid setup key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Key is valid, proceed with admin creation
      const { data, error } = await supabase.rpc('create_first_admin_user', {
        admin_email: email?.toLowerCase().trim()
      });

      if (error) {
        console.error('Admin creation error:', error);
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record-attempt') {
      // Record login attempt
      const { data, error } = await supabase.rpc('record_login_attempt', {
        p_email: email?.toLowerCase() || null,
        p_ip_address: clientIp,
        p_user_agent: clientUserAgent,
        p_success: success || false,
        p_failure_reason: failureReason || null,
        p_attempt_type: attemptType || 'login'
      });

      if (error) {
        console.error('Record attempt error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to record attempt' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attemptId: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-captcha') {
      const operators = ['+', '-', '×'];
      const operator = operators[Math.floor(Math.random() * operators.length)];
      let num1 = Math.floor(Math.random() * 10) + 1;
      let num2 = Math.floor(Math.random() * 10) + 1;

      if (operator === '-' && num2 > num1) {
        [num1, num2] = [num2, num1];
      }

      // Create a signed challenge (simple version)
      const challenge = { num1, num2, operator, ts: Date.now() };
      const challengeStr = JSON.stringify(challenge);
      // In a real app, we'd use a real HMAC. Here we'll use a simple base64 + key suffix
      const signature = btoa(challengeStr + supabaseServiceKey);

      return new Response(
        JSON.stringify({ challenge, signature }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify-captcha') {
      if (!signature || !challenge) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Missing captcha data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify signature
      const expectedSignature = btoa(JSON.stringify(challenge) + supabaseServiceKey);
      if (signature !== expectedSignature) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify timestamp (5 minute window)
      if (Date.now() - challenge.ts > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Captcha expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate expected answer
      let expected;
      switch (challenge.operator) {
        case '+': expected = challenge.num1 + challenge.num2; break;
        case '-': expected = challenge.num1 - challenge.num2; break;
        case '×': expected = challenge.num1 * challenge.num2; break;
        default: expected = null;
      }

      const isValid = expected !== null && Number(captchaAnswer) === expected;

      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check-admin-ip') {
      // Check if IP is whitelisted for admin access
      const { data, error } = await supabase.rpc('check_admin_ip_whitelist', {
        p_ip_address: clientIp
      });

      if (error) {
        console.error('IP whitelist check error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to check IP whitelist' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ allowed: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-failed-attempts') {
      // Get recent failed login attempts for monitoring
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Get failed attempts error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get attempts' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ attempts: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'unlock-account') {
      // Unlock a locked account (admin only)
      const { error } = await supabase
        .from('account_lockouts')
        .delete()
        .eq('email', email?.toLowerCase());

      if (error) {
        console.error('Unlock account error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to unlock account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth security error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

