import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface ReentryQuery {
  query: string;
  location?: string;
  county?: string;
  reentryStage?: 'preparing' | 'recently_released' | 'long_term' | 'family_member';
  priorityNeeds?: Array<'housing' | 'employment' | 'legal' | 'education' | 'healthcare' | 'family' | 'financial'>;
  selectedCoach?: {
    name: string;
    specialty: string;
    description: string;
  };
  previousContext?: Array<{ role: string, content: string }>;
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'reentry-navigator-ai';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<ReentryQuery>(req);
    if (!body || !body.query) {
      return errorResponse('Missing query', 400);
    }

    const { query, location, county, reentryStage = 'recently_released', priorityNeeds = [], selectedCoach, previousContext = [] } = body;

    // Standardized rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.identifier;

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

    // Enhanced resource filtering (production schema uses category/is_active)
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('category.ilike.%housing%,category.ilike.%employment%,category.ilike.%job training%,category.ilike.%education%,category.ilike.%reentry%,category.ilike.%legal aid%,category.ilike.%mental health%,category.ilike.%substance abuse%,category.ilike.%healthcare%,category.ilike.%transportation%')
      .eq('is_active', true)
      .limit(10);

    if (location || county) {
      const searchLocation = location || county;
      resourceQuery = resourceQuery.or(`state_code.ilike.%${searchLocation}%,title.ilike.%${searchLocation}%,organization.ilike.%${searchLocation}%`);
    }

    const { data: resources } = await resourceQuery;

    const systemPrompt = getCoachSystemPrompt(selectedCoach, resources || []);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousContext,
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

    let aiMessage = '';
    let degraded = false;
    let degradedReason: string | null = null;

    try {
      const response = await callOpenRouterWithFallback(
        OPENROUTER_API_KEY,
        {
          messages: messages as OpenRouterMessage[],
          max_tokens: 1500,
          temperature: 0.7,
        },
        OPENROUTER_MODELS.CHAT_STREAMING,
        OPENROUTER_MODELS.CHAT_STANDARD
      );

      const aiData = await response.json();
      aiMessage = aiData?.choices?.[0]?.message?.content || '';

      if (!aiMessage) {
        throw new Error('OpenRouter response did not include message content');
      }
    } catch (providerError) {
      console.error(`[${endpoint}] Provider fallback engaged:`, providerError);
      degraded = true;
      degradedReason = providerError instanceof Error ? providerError.message : String(providerError);
      aiMessage = "I am having trouble reaching the AI service right now, but I can still help with trusted reentry resources. Use the resources below to get immediate support for housing, employment, legal aid, healthcare, and transportation. If this is urgent, call 2-1-1 for local guidance.";
    }

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    return successResponse({
      response: aiMessage,
      reentryStage,
      priorityNeeds,
      degraded,
      degradedReason,
      rateLimitRemaining: rateLimit.remaining - 1,
    });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);

    return errorResponse(
      'Reentry Navigator is temporarily unavailable. Please try again in a moment.',
      503,
      error instanceof Error ? error.message : error,
    );
  }
});

function getCoachSystemPrompt(coach?: { name: string; specialty: string; description: string; }, resources: any[] = []): string {
  const basePrompt = `You are Coach Kay, the lead navigator for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation. You serve all 88 counties across Ohio, specializing in AI & Life Transformation for individuals seeking a second chance.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Maintain an objective, professional, and sympathetic tone.
- Avoid conversational filler. Provide pure, structured, and informative output.

### Core Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or transformation process.
2. **Transformation Expertise**: Provide guidance on housing, employment, legal aid, mindfulness-based success, financial foundations, and AI-driven growth.
3. **Ohio-Wide Support**: Ensure coverage across all 88 Ohio counties, prioritizing Columbus/Franklin County when applicable.

### Available Ohio Resources
${JSON.stringify(resources)}

Remember: You are the guide for second chances and AI-driven life transformation.`;

  if (!coach) return basePrompt;

  const coachPrompts: Record<string, string> = {
    'Coach Dana': `\n\n**As Coach Dana - Housing Transition Specialist:** I'm your dedicated housing advocate. I understand the unique challenges of finding stable housing with a criminal record.`,
    'Coach Malik': `\n\n**As Coach Malik - Employment Support Navigator:** I'm here to help you land meaningful work that supports your goals.`,
    'Coach Rivera': `\n\n**As Coach Rivera - Legal Guidance Counselor:** I specialize in helping you navigate the complex legal landscape after incarceration.`,
    'Coach Taylor': `\n\n**As Coach Taylor - Family Support Specialist:** Rebuilding family relationships takes courage and patience.`,
    'Coach Jordan': `\n\n**As Coach Jordan - Financial Stability Coach:** Financial stability is foundational to successful reentry.`,
    'Coach Sam': `\n\n**As Coach Sam - Mental Wellness Advocate:** Your mental health is just as important as your physical wellbeing.`
  };

  return basePrompt + (coachPrompts[coach.name] || '');
}
