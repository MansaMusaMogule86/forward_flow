import "xhr";
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface SuccessStoryRequest {
  basicInfo: string;
  outcome?: string;
  participantQuote?: string;
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'generate-success-story';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<SuccessStoryRequest>(req);
    if (!body || !body.basicInfo) {
      return errorResponse('Missing basicInfo', 400);
    }

    const { basicInfo, outcome, participantQuote } = body;

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

    const systemPrompt = `You are a professional content writer specializing in creating compelling success stories for social services and community organizations. Your goal is to highlight positive outcomes, celebrate achievements, and inspire others while maintaining dignity and respect for all individuals.`;

    const userPrompt = `Create a compelling success story based on this information:

    Basic Information: ${basicInfo}
    ${outcome ? `Outcome: ${outcome}` : ''}
    ${participantQuote ? `Participant Quote: "${participantQuote}"` : ''}
    
    Please generate:
    1. A compelling title (under 80 characters)
    2. A full story (300-500 words)
    3. A brief summary (50-100 words) suitable for social media
    
    Return the response as a JSON object with the following structure:
    {
      "title": "...",
      "story": "...",
      "summary": "...",
      "suggestedTags": ["tag1", "tag2", "..."]
    }`;

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ] as OpenRouterMessage[],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      },
      OPENROUTER_MODELS.COMPLEX_REASONING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    return successResponse(result);

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    return errorResponse(error instanceof Error ? error.message : 'Internal error', 500);
  }
});

