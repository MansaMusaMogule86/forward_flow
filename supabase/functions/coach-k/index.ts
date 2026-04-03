import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

const SYSTEM_PROMPT = `You are Coach Kay, the primary AI-powered navigator for Forward Focus Elevation. You serve all 88 counties in Ohio and provide support for both "The Collective" (AI & Life Transformation Hub) and the "Healing Hub" (Victim Services).

### Tone and Style
- Use clear markdown headers (##) for structure.
- Maintain an objective, professional, and sympathetic tone.
- Avoid unnecessary conversational filler.
- Output should be pure, structured, and informative.

### Key Functions
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or coaching process.
2. **Site Navigation**:
   - Direct users to "The Collective" for AI & life transformation.
   - Direct users to the "Healing Hub" for trauma-informed victim support.
3. **Resource Routing**: Help users find housing, employment, legal aid, and wellness support across Ohio.
4. **Coaching Consults**: Direct users to book a free call at: https://calendly.com/ffe_coach_kay/free-call

### Safety and Compliance
- Never provide legal, medical, or mental-health advice.
- For immediate crisis, prioritize 988 or 911.

Remember: You are the hub for second chances. Provide clear, actionable, and compassionate guidance.`;

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  let userId: string | undefined;
  const endpoint = 'coach-k';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await parseRequestBody<ChatRequest>(req);
    if (!body || !body.messages) {
      return errorResponse('Missing messages', 400);
    }

    const { messages, stream: shouldStream = false } = body;

    // Standardized rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, endpoint);
    userId = rateLimit.identifier;

    if (rateLimit.limited) {
      await logAiUsage(supabase, endpoint, Date.now() - startTime, 1, userId);
      return new Response(
        JSON.stringify({ error: rateLimit.message || 'Rate limit exceeded.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openRouterMessages: OpenRouterMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role as any, content: m.content }))
    ];

    // Optional Perplexity Search for resources
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const needsWebSearch = lastMessage.includes('find') || lastMessage.includes('search') || lastMessage.includes('resource') || lastMessage.includes('where');

    if (needsWebSearch) {
      const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
      if (PERPLEXITY_API_KEY) {
        try {
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                { role: 'system', content: 'Find verified Ohio resources (name, phone, website). Return structured summary.' },
                { role: 'user', content: `Search for Ohio resources related to: ${lastMessage}` }
              ],
              max_tokens: 500
            }),
          });

          if (perplexityResponse.ok) {
            const webData = await perplexityResponse.json();
            const webSummary = webData.choices[0].message.content;
            openRouterMessages.push({ role: 'system', content: `Current web information: ${webSummary}` });
          }
        } catch (err) {
          console.error('Perplexity search failed:', err);
        }
      }
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: openRouterMessages,
        stream: shouldStream,
        temperature: 0.7,
        max_tokens: 1000,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    // Log success (approximate for streaming)
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
