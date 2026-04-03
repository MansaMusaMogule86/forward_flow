import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface VictimSupportQuery {
  query: string;
  location?: string;
  county?: string;
  victimType?: 'domestic_violence' | 'sexual_assault' | 'violent_crime' | 'property_crime' | 'other';
  traumaLevel?: 'recent' | 'ongoing' | 'past' | 'complex';
  previousContext?: Array<{role: string, content: string}>;
}

const SUPPORT_SERVICES = {
  domesticViolence: "1-800-799-7233",
  sexualAssault: "1-800-656-4673", 
  crisisSupport: "988",
  ohioVictimCompensation: "https://www.ohioattorneygeneral.gov/Individuals-and-Families/Victims"
};

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'victim-support-ai';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<VictimSupportQuery>(req);
    if (!body || !body.query) {
      return errorResponse('Missing query', 400);
    }

    const { query, location, county, victimType, traumaLevel = 'ongoing', previousContext = [] } = body;

    // Standardized rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.identifier;

    if (rateLimit.limited) {
      await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
      return new Response(JSON.stringify({
        error: rateLimit.message || 'Rate limit exceeded.',
        supportMessage: 'For immediate victim support, please call the National Domestic Violence Hotline at 1-800-799-7233.',
        supportServices: SUPPORT_SERVICES
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch local resources from DB
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%victim%,type.ilike.%legal aid%,type.ilike.%compensation%,type.ilike.%counseling%,type.ilike.%trauma%,type.ilike.%advocacy%,type.ilike.%domestic violence%,type.ilike.%sexual assault%')
      .eq('verified', true)
      .limit(10);

    if (location || county) {
      const searchLocation = location || county;
      resourceQuery = resourceQuery.or(`city.ilike.%${searchLocation}%,county.ilike.%${searchLocation}%`);
    }

    const { data: dbResources } = await resourceQuery;

    // Victim support system prompt
    const systemPrompt = `You are Coach Kay, the trauma-informed navigator for the Healing Hub at Forward Focus Elevation. You serve all 88 counties across Ohio, specializing in support for crime victims and survivors.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Maintain an objective, professional, and sympathetic tone.
- Avoid conversational filler. Provide pure, structured, and informative output.

### Core Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or healing process.
2. **Trauma-Informed Care**: Acknowledge strength, validate experiences without judgment, and emphasize that what happened was not their fault.
3. **Ohio-Wide Expertise**: Provide guidance on legal rights, victim compensation, trauma counseling, and safety planning.

### Available Ohio Resources
${JSON.stringify(dbResources || [])}

### Communication Guidelines
- Use "survivor" language when appropriate.
- For immediate crisis, prioritize 988 or 911.

Remember: You are the guide for healing and second chances. Provide clear, actionable, and compassionate guidance.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousContext,
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

    const openRouterResponse = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: messages as OpenRouterMessage[],
        max_tokens: 1200,
        temperature: 0.7
      },
      OPENROUTER_MODELS.CRISIS_SPECIALIZED,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!openRouterResponse.ok) throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);

    const aiData = await openRouterResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // Log success
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 0, userId);

    return successResponse({
      response: aiMessage,
      resources: dbResources || [],
      supportServices: SUPPORT_SERVICES,
      victimType,
      traumaLevel
    });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    
    return successResponse({ 
      response: 'I apologize for the technical difficulty. Let me connect you with local Ohio victim services and family justice centers in your area that can provide immediate support.',
      supportServices: SUPPORT_SERVICES,
      resources: []
    });
  }
});
