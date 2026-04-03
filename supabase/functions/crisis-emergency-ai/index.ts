import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { checkAiRateLimit } from '../_shared/rate-limit.ts';
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyQuery {
  query: string;
  location?: string;
  county?: string;
  urgencyLevel?: 'immediate' | 'urgent' | 'moderate' | 'informational';
  previousContext?: Array<{role: string, content: string}>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let errorCount = 0;

  try {
    const { query, location, county, urgencyLevel = 'moderate', previousContext = [] }: EmergencyQuery = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting check
    const rateLimit = await checkAiRateLimit(supabase, req, 'crisis-emergency-ai');

    if (rateLimit.limited) {
      return new Response(JSON.stringify({
        error: "You've reached your daily limit for free AI consultations. For immediate support, please call 988 or 211. To get unlimited access to our AI tools, please sign in.",
        resources: [],
        rateLimitExceeded: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced resource filtering for emergency situations
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%,type.ilike.%support%,type.ilike.%advocacy%')
      .eq('verified', true)
      .limit(15);

    if (location || county) {
      const searchLocation = location || county;
      resourceQuery = resourceQuery.or(`city.ilike.%${searchLocation}%,county.ilike.%${searchLocation}%`);
    }

    const { data: resources, error: dbError } = await resourceQuery;
    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to fetch resources');
    }

    // Emergency-specific system prompt optimized for Ohio
    const systemPrompt = `You are Coach Kay, the lead Crisis Emergency navigator for Forward Focus Elevation. You serve all 88 counties across Ohio, providing immediate support and connecting users with the Healing Hub or emergency services.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- Maintain an objective, professional, and sympathetic tone.
- Avoid conversational filler. Provide pure, structured, and informative output.

### Core Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or stabilization process.
2. **Immediate Assessment**: Quickly assess the person's current situation and safety. Focus on immediate stabilization.
3. **Ohio-Wide Support**: Prioritize local Ohio resources and emergency services across all 88 counties.
4. **Sympathy & Alertness**: Be alert to danger signs and respond with professional sympathy and actionable help.

### Available Ohio Resources
${JSON.stringify(resources?.slice(0, 10) || [])}

### Important Guidelines:
- For immediate danger, prioritize 911.
- For suicide/crisis support, emphasize 988.
- For domestic violence, emphasize 1-800-799-7233.

Remember: Safety first. Your role is to stabilize and connect users with verified Ohio help and second chances.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousContext,
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Use Claude Haiku for emergency - better safety alignment
    const openRouterResponse = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: messages as OpenRouterMessage[],
        max_tokens: 1000,
      },
      OPENROUTER_MODELS.CRISIS_SUPPORT,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', await openRouterResponse.text());
      errorCount++;
      throw new Error('Failed to generate AI response');
    }

    const aiData = await openRouterResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // Web Search Fallback (Perplexity)
    let webResources: any[] = [];
    if ((resources?.length || 0) < 2) {
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
              { role: 'system', content: 'You are an emergency resource finder for Coach Kay at Forward Focus Elevation. Find verified Ohio crisis services (name, phone, website) across all 88 counties. Prioritize Columbus and Franklin County if applicable. Return as structured JSON or a clear list.' },
              { role: 'user', content: `Search for immediate Ohio crisis support related to: ${query} ${location ? 'near ' + location : ''}` }
            ],
            max_tokens: 1000
          }),
        });

        if (perplexityResponse.ok) {
          const webData = await perplexityResponse.json();
          webResources = [{
            name: 'Latest Emergency Resources',
            description: webData.choices[0].message.content,
            type: 'web_search',
            source: 'perplexity'
          }];
        }
      } catch (err) {
        console.error('Web search error:', err);
      }
    }

    // Filter resources based on query context
    const relevantResources = resources?.filter(resource => {
      const queryLower = query.toLowerCase();
      const resourceName = resource.name?.toLowerCase() || '';
      const resourceDesc = resource.description?.toLowerCase() || '';
      const resourceType = resource.type?.toLowerCase() || '';
      
      if (queryLower.includes('crisis') || queryLower.includes('emergency') || queryLower.includes('help')) {
        return resourceType.includes('crisis') || resourceType.includes('emergency') || resourceType.includes('support');
      }
      if (queryLower.includes('mental health') || queryLower.includes('depression') || queryLower.includes('anxiety')) {
        return resourceType.includes('mental health') || resourceType.includes('counseling');
      }
      
      return resourceName.includes(queryLower) || 
             resourceDesc.includes(queryLower) || 
             resourceType.includes('crisis') ||
             resourceType.includes('support');
    })?.slice(0, 8) || [];

    // Log usage analytics
    const responseTime = Date.now() - startTime;
    try {
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'crisis-emergency-ai',
        p_user_id: null,
        p_response_time_ms: responseTime,
        p_error_count: errorCount
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
    }

    return new Response(JSON.stringify({
      response: aiMessage,
      resources: relevantResources,
      webResources,
      urgencyLevel,
      totalResources: resources?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Crisis Emergency AI error:', error);
    errorCount++;
    
    const responseTime = Date.now() - startTime;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'crisis-emergency-ai',
        p_user_id: null,
        p_response_time_ms: responseTime,
        p_error_count: errorCount
      });
    } catch (logError) {
      console.error('Failed to log AI usage error:', logError);
    }
    
    return new Response(JSON.stringify({ 
      error: 'I apologize for the technical difficulty. Let me connect you with local Ohio crisis support resources in your area.',
      resources: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

