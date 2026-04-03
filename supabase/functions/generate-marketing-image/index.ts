import "xhr";
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { callOpenRouter } from '../_shared/openrouter.ts';

interface ImageRequest {
  prompt: string;
  style?: 'professional' | 'inspirational' | 'community' | 'celebration';
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'generate-marketing-image';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<ImageRequest>(req);
    if (!body || !body.prompt) {
      return errorResponse('Missing prompt', 400);
    }

    const { prompt, style = 'professional' } = body;

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

    const styleEnhancements = {
      professional: 'professional, clean, modern design, high quality',
      inspirational: 'inspirational, uplifting, hopeful, warm colors',
      community: 'diverse community, inclusive, welcoming, supportive environment',
      celebration: 'celebratory, joyful, achievement, success story'
    };

    const enhancedPrompt = `${prompt.substring(0, 1000)}. Style: ${styleEnhancements[style] || styleEnhancements.professional}. High resolution, suitable for social media and marketing materials. Include diverse representation.`;

    const response = await callOpenRouter(OPENROUTER_API_KEY, {
      model: 'black-forest-labs/flux-schnell',
      messages: [{ role: 'user', content: enhancedPrompt }]
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.image_url;

    if (!imageUrl) throw new Error('No image generated');

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    return successResponse({ imageUrl, prompt: enhancedPrompt });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    return errorResponse(error instanceof Error ? error.message : 'Internal error', 500);
  }
});

