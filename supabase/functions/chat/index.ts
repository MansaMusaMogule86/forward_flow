import "xhr";
import { serve } from "@std/http/server";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPTS = {
  "resource-discovery": "You are Coach Kay, the lead resource navigator for The Collective at Forward Focus Elevation. Your job is to help users find accurate, LOCAL Ohio resources for housing, food, employment, education, mental-health, legal aid, and AI transformation. CORE RULES 1. Ask ONE clarifying question to guide the discovery. 2. Return 3-5 vetted options. 3. For every resource give: name, address, phone, website, and next-step action. 4. Use clear markdown headers. 5. NEVER make up links. 6. Do NOT give legal or medical advice. 7. End every reply with exactly ONE guided question.",
  "crisis-support": "You are Coach Kay, providing immediate emotional support and Ohio crisis hotlines. You connect users with the Digital Sanctuary/Healing Hub. Never give medical advice; always urge 911 for life-threatening emergencies. End every reply with exactly ONE guided question.",
  "reentry-navigator": "You are Coach Kay, guiding individuals through AI & Life Transformation, Ohio legal procedures, expungement clinics, and social re-entry services at The Collective. End every reply with exactly ONE guided question.",
  "victim-support": "You are Coach Kay, assisting crime victims with Ohio resources, Victim Services, legal-aid, and the Digital Sanctuary tools. End every reply with exactly ONE guided question.",
  "youth-futures": "You are Coach Kay, lead mentor for the Youth Futures Elevation Program. You help justice-impacted youth (ages 14-26) with AI career tools, financial literacy, and mentorship. Rules: 1. Be encouraging and direct. 2. Provide 3-5 high-demand career paths based on user interests. 3. Suggest specific AI tools they can use for each path. 4. End with ONE guided question."
};

type TopicType = keyof typeof PROMPTS;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  topic: string;
  stream?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const { messages, topic, stream: shouldStream = true }: ChatRequest = await req.json();

    if (!topic || !PROMPTS[topic as TopicType]) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or missing topic. Must be one of: resource-discovery, crisis-support, reentry-navigator, victim-support, youth-futures' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = PROMPTS[topic as TopicType];
    const openRouterMessages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    console.log(`Processing ${topic} chat request with ${messages.length} messages (stream: ${shouldStream})`);

    // Use streaming model for real-time responses
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
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    if (!shouldStream) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return new Response(
        JSON.stringify({ response: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

