import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface EmergencyQuery {
  query: string;
  location?: string;
  county?: string;
  urgencyLevel?: 'immediate' | 'urgent' | 'moderate' | 'informational';
  previousContext?: Array<{role: string, content: string}>;
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'crisis-emergency-ai';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<EmergencyQuery>(req);
    if (!body || !body.query) {
      return errorResponse('Missing query', 400);
    }

    const { query, location, county, urgencyLevel = 'moderate', previousContext = [] } = body;

    // Standardized rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.userId;

    if (rateLimit.limited) {
      await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
      return new Response(
        JSON.stringify({ 
          error: rateLimit.message || 'Rate limit exceeded.',
          rateLimitExceeded: true 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced resource filtering
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%,type.ilike.%support%,type.ilike.%advocacy%')
      .eq('verified', true)
      .limit(10);

    if (location || county) {
      const searchLocation = location || county;
      resourceQuery = resourceQuery.or(`city.ilike.%${searchLocation}%,county.ilike.%${searchLocation}%`);
    }

    const { data: resources } = await resourceQuery;

    const systemPrompt = `You are Coach Kay, the lead Crisis Emergency navigator for Forward Focus Elevation. You serve all 88 counties across Ohio.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Maintain an objective, professional, and sympathetic tone.
- End with exactly ONE guided question.

### Core Principles
1. **Safety First**: For immediate danger, prioritize 911. For suicide/crisis, prioritize 988.
2. **Immediate Assessment**: Stabilize and connect users with verified Ohio help.

### Available Ohio Resources
${JSON.stringify(resources || [])}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousContext,
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: messages as OpenRouterMessage[],
        max_tokens: 1000,
        temperature: 0.7,
      },
      OPENROUTER_MODELS.CRISIS_SUPPORT || OPENROUTER_MODELS.CHAT_STANDARD,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiMessage = aiData.choices[0].message.content;

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    return successResponse({
      response: aiMessage,
      resources: resources || [],
      urgencyLevel,
    });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    
    return successResponse({ 
      response: "I'm having some trouble connecting right now, but your safety is my priority. If you're in immediate danger, please call **911**. For crisis support, call or text **988**.",
      resources: [],
      urgencyLevel: 'urgent'
    });
  }
});
