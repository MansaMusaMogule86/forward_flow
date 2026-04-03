import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface CrisisQuery {
  query: string;
  location?: string;
  county?: string;
  urgencyLevel?: 'immediate' | 'urgent' | 'moderate' | 'informational';
  previousContext?: Array<{role: string, content: string}>;
}

const CRISIS_RESOURCES = [
  { name: "988 Suicide & Crisis Lifeline", phone: "988", description: "24/7 free and confidential support for people in distress." },
  { name: "Ohio CareLine", phone: "1-800-720-9616", description: "Emotional support call line staffed by behavioral health professionals." },
  { name: "Crisis Text Line", phone: "Text HOME to 741741", description: "Connect with a Crisis Counselor." },
  { name: "National Domestic Violence Hotline", phone: "1-800-799-SAFE (7233)", description: "Confidential support for those experiencing domestic violence." }
];

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'crisis-support-ai';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<CrisisQuery>(req);
    if (!body || !body.query) {
      return errorResponse('Missing query', 400);
    }

    const { query, location, county, urgencyLevel = 'moderate', previousContext = [] } = body;

    // Standardized rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.userId;

    if (rateLimit.limited) {
      await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
      return new Response(JSON.stringify({
        error: rateLimit.message || 'Rate limit exceeded. Please wait a few minutes before trying again.',
        supportMessage: 'For immediate crisis support, please call 988 (Suicide & Crisis Lifeline) or 911.',
        resources: CRISIS_RESOURCES
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch local resources from DB
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%,type.ilike.%suicide%,type.ilike.%domestic violence%,type.ilike.%substance abuse%')
      .eq('verified', true)
      .limit(10);

    if (location || county) {
      const searchLocation = location || county;
      resourceQuery = resourceQuery.or(`city.ilike.%${searchLocation}%,county.ilike.%${searchLocation}%`);
    }

    const { data: dbResources } = await resourceQuery;

    // Crisis-specific system prompt
    const systemPrompt = `You are Coach Kay, the Crisis Support companion for the Healing Hub at Forward Focus Elevation, serving all 88 counties across Ohio. You specialize in immediate crisis intervention, safety planning, and connecting people with the "Healing Hub" for long-term support.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Maintain an objective, professional, and sympathetic tone.
- Provide pure, structured guidance with empathy.

### Crisis Intervention Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery process or safety assessment.
2. **Immediate Safety**: Focus on immediate safety and practical next steps.
3. **Ohio-Wide Support**: Prioritize local community resources, family justice centers, and Ohio-specific support systems.

### Available Ohio Resources
${JSON.stringify(dbResources || CRISIS_RESOURCES)}

### Important Guidelines
- For immediate danger, prioritize 911.
- For suicide/crisis support, emphasize 988.
- For domestic violence, emphasize 1-800-799-7233.

Remember: You are the companion for second chances and healing. Provide clear, actionable, and compassionate guidance.`;

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
        max_tokens: 1000,
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
      resources: dbResources || CRISIS_RESOURCES,
      urgencyLevel
    });

  } catch (error) {
    console.error(`[${endpoint}] Error:`, error);
    
    await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
    
    const fallbackMessage = `I'm here with you, and I want you to know that you're not alone. While I'm having some technical difficulties right now, your wellbeing is my priority.

**If you're in immediate danger, please call 911 right now.**

**For crisis support:**
• 988 - Suicide & Crisis Lifeline (available 24/7)
• Text HOME to 741741 - Crisis Text Line
• 1-800-799-7233 - National Domestic Violence Hotline`;

    return successResponse({ 
      response: fallbackMessage,
      resources: CRISIS_RESOURCES,
      urgencyLevel: 'urgent'
    });
  }
});
