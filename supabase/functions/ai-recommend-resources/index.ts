import "xhr";
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCORS, logAiUsage, getSafeUserId } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback } from '../_shared/openrouter.ts';

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

    // Rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, 'ai-recommend-resources');
    if (rateLimit.limited) {
      return new Response(
        JSON.stringify({ error: rateLimit.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userNeeds, location, category } = await req.json();

    // Fetch verified resources for matching
    const { data: resources } = await supabase
      .from('resources')
      .select('*')
      .eq('verified', true)
      .limit(30);

    const resourceContext = (resources || []).map(r =>
      `${r.name}: ${r.description} (Category: ${r.category}, Location: ${r.city}, ${r.state})`
    ).join('\n') || 'No local Ohio resources available in database.';

    const systemPrompt = `You are an expert resource navigator for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation. Analyze user needs and recommend the 3-5 most relevant Ohio resources.`;

    const userPrompt = `User needs: ${userNeeds}
${location ? `Location: ${location}` : ''}
${category ? `Preferred category: ${category}` : ''}

Available resources:
${resourceContext}`;

    console.log(`Processing Resource Recommendation for user ${userId}`);

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'recommend_resources',
            description: 'Provide structured recommendations',
            parameters: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      resourceName: { type: 'string' },
                      reason: { type: 'string' },
                      matchScore: { type: 'number' }
                    }
                  }
                },
                summary: { type: 'string' }
              },
              required: ['recommendations', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'recommend_resources' } },
        temperature: 0.1,
      },
      OPENROUTER_MODELS.RESOURCE_DISCOVERY,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI response missing expected tool call');
    }
    const result = JSON.parse(toolCall.function.arguments);

    // Log success
    await logAiUsage(supabase, 'ai-recommend-resources', userId, Date.now() - startTime);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-recommend-resources:', error);
    await logAiUsage(supabase, 'ai-recommend-resources', userId, Date.now() - startTime, 1);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
