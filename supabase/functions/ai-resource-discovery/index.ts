import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCORS, logAiUsage, getSafeUserId } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface ResourceQuery {
  query: string;
  location?: string;
  county?: string;
  resourceType?: string;
  limit?: number;
}

serve(async (req) => {
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = getSafeUserId(req);

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const { query, location, county, resourceType, limit = 10 }: ResourceQuery = await req.json();

    // Rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, 'ai-resource-discovery');
    if (rateLimit.limited) {
      return new Response(
        JSON.stringify({ error: rateLimit.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch resources from database
    let resourcesQuery = supabase
      .from('resources')
      .select('*')
      .eq('verified', true)
      .limit(30);

    if (county) {
      resourcesQuery = resourcesQuery.ilike('county', `%${county}%`);
    }
    if (location) {
      resourcesQuery = resourcesQuery.or(`city.ilike.%${location}%,county.ilike.%${location}%`);
    }
    if (resourceType) {
      resourcesQuery = resourcesQuery.ilike('type', `%${resourceType}%`);
    }

    const { data: resources } = await resourcesQuery;

    const systemPrompt = `You are Coach Kay, the lead resource navigator for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation, serving all 88 Ohio counties.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- End with exactly ONE guided question.

### Core Principles
1. **Safety First**: For immediate danger, prioritize 911. For suicide/crisis, prioritize 988.
2. **Empowerment**: Prioritize justice-friendly and verified resources.

### Available Resources Context
${JSON.stringify(resources || [])}`;

    console.log(`Processing Resource Discovery for user ${userId}`);

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiMessage = aiData.choices[0].message.content;

    // Log success
    await logAiUsage(supabase, 'ai-resource-discovery', userId, Date.now() - startTime);

    return new Response(JSON.stringify({
      response: aiMessage,
      curatedResources: resources?.slice(0, limit) || [],
      totalFound: resources?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-resource-discovery:', error);
    await logAiUsage(supabase, 'ai-resource-discovery', userId, Date.now() - startTime, 1);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
