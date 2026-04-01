import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkAiRateLimit } from '../_shared/rate-limit.ts';
import { OPENROUTER_MODELS, callOpenRouterWithFallback } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const { messages }: ChatRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting check
    const rateLimit = await checkAiRateLimit(supabase, req, 'coach-k');

    if (rateLimit.limited) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"You've reached your daily limit for free AI consultations. To continue using Coach Kay's advanced features and get unlimited support, please [Join The Collective](/register) or [Sign In](/auth)."}}]}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(errorStream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"Invalid request format. Please try again. Need more help? Reply here any time."}}]}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(errorStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Prepare messages for OpenRouter with Coach Kay system prompt
    const systemPrompt = `You are Coach Kay, the primary AI-powered navigator for Forward Focus Elevation. You serve all 88 counties in Ohio and provide support for both "The Collective" (AI & Life Transformation Hub) and the "Healing Hub" (Victim Services).

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- Maintain an objective, professional, and sympathetic tone.
- Avoid unnecessary conversational filler or excessive "AI persona" quirks.
- Output should be pure, structured, and informative.

### Key Functions
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or coaching process.
2. **Site Navigation**:
   - Direct users to "The Collective" for AI & life transformation, personal growth, and to join the "Focus Flow Elevation Hub" Skool community.
   - Direct users to the "Healing Hub" for trauma-informed victim support and safety resources.
3. **Resource Routing**: Help users find housing, employment, legal aid, and wellness support across Ohio.
4. **Coaching Consults**: Direct users to book a free call at: https://calendly.com/ffe_coach_kay/free-call

### Safety and Compliance
- Never provide legal, medical, or mental-health advice.
- Always point to licensed professionals or verified resources.
- For immediate crisis, prioritize 988 or 911.

Remember: You are the hub for second chances. Provide clear, actionable, and compassionate guidance.`;
    
    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    console.log(`Processing Coach K chat request with ${messages.length} messages`);

    // Check if the latest message asks for resources/specific info that might need web search
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const needsWebSearch = lastMessage.includes('find') || lastMessage.includes('search') || lastMessage.includes('resource') || lastMessage.includes('where');

    if (needsWebSearch) {
      try {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: 'You are a resource assistant for Coach Kay at Forward Focus Elevation. Find verified Ohio resources (name, phone, website) across all 88 counties. Prioritize Columbus and Franklin County if applicable. Return a structured summary.' },
              { role: 'user', content: `Search for Ohio resources related to: ${lastMessage}` }
            ],
            max_tokens: 600
          }),
        });

        if (perplexityResponse.ok) {
          const webData = await perplexityResponse.json();
          const webSummary = webData.choices[0].message.content;
          openRouterMessages.push({ role: 'system', content: `Current web information for resources: ${webSummary}` });
        }
      } catch (err) {
        console.error('Web search error in Coach K:', err);
      }
    }

    // Call OpenRouter API with streaming - use cheap flash model
    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: openRouterMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      
      let errorMessage = 'Service temporarily unavailable';
      if (response.status === 429) {
        errorMessage = 'Service busy - please try again in a moment';
      } else if (response.status === 401) {
        errorMessage = 'Authentication error - please try again';
      }
      
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${errorMessage}. Need more help? Reply here any time."}}]}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(errorStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in coach-k function:', error);
    
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"Sorry, I can't reach the server right now. Please try again in a moment. Need more help? Reply here any time."}}]}\n\n`));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new Response(errorStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
});
