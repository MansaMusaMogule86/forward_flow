import "xhr";
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

const SYSTEM_PROMPT = `You are the Partner Support Assistant for Forward Focus Elevation, specializing in AI & Life Transformation through "The Collective" and the "Focus Flow Elevation Hub".

### Partner Benefits
- Verified Partner Badge for credibility.
- AI & Resource Sharing tools.
- Direct Referral System for client management.
- Analytics Dashboard for impact tracking.

### Portal Navigation
- Dashboard: Stats and impact scores (/partner-dashboard)
- Quick Actions: Submit referrals, add resources, request verification.
- Partner Network: Browse and collaborate with other verified partners.

### Communication Style
- Warm, professional, and solution-oriented.
- Provide specific navigation paths with exact page URLs.
- Celebrate partner contributions.
- End with exactly ONE guided question.`;

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'partner-support-chat';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<any>(req);
    const { messages, stream: shouldStream = false } = body || {};
    if (!messages) {
      return errorResponse('Missing messages', 400);
    }

    // Rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.identifier;

    if (rateLimit.limited) {
      await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
      return new Response(
        JSON.stringify({ error: rateLimit.message || 'Rate limit exceeded.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        stream: shouldStream,
        temperature: 0.7,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    if (!shouldStream) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ response: content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    return errorResponse(error instanceof Error ? error.message : 'Internal error', 500);
  }
});
