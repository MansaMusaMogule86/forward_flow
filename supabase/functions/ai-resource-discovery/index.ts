import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { OPENROUTER_MODELS, callOpenRouterWithFallback } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ResourceQuery {
  query: string;
  location?: string;
  county?: string;
  resourceType?: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let errorCount = 0;

  try {
    const { query, location, county, resourceType, limit = 10 }: ResourceQuery = await req.json();
    
    console.log('AI Resource Discovery Request:', { query, location, county, resourceType });

    // Get relevant resources from database
    let resourcesQuery = supabase
      .from('resources')
      .select('*')
      .limit(50);

    // Apply filters based on query parameters
    if (county) {
      resourcesQuery = resourcesQuery.ilike('county', `%${county}%`);
    }
    if (location) {
      resourcesQuery = resourcesQuery.or(`city.ilike.%${location}%,county.ilike.%${location}%`);
    }
    if (resourceType) {
      resourcesQuery = resourcesQuery.ilike('type', `%${resourceType}%`);
    }

    const { data: resources, error: resourceError } = await resourcesQuery;
    
    if (resourceError) {
      console.error('Database error:', resourceError);
      return new Response(JSON.stringify({ error: 'Failed to fetch resources' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare context for AI
    const resourceContext = resources?.map(r => ({
      name: r.name,
      organization: r.organization,
      type: r.type,
      city: r.city,
      county: r.county,
      description: r.description,
      phone: r.phone,
      website: r.website,
      verified: r.verified,
      justice_friendly: r.justice_friendly
    })) || [];

    const systemPrompt = `You are Coach Kay, the lead resource navigator for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation. You specialize in Ohio community resources and AI & Life Transformation support services across all 88 counties.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- Maintain an objective, professional, and sympathetic tone.
- Avoid conversational filler. Provide pure, structured, and informative output.

### Core Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or transformation process.
2. **Resource Richness**: Provide detailed information about services, locations, and contact details. Suggest multiple options when available.
3. **Ohio-Wide Support**: Ensure coverage across all 88 Ohio counties, prioritizing Columbus/Franklin County when applicable.
4. **Empowerment**: Mention if a resource is "justice-friendly" and prioritize verified partner resources.

### Available Resources Context
${JSON.stringify(resourceContext, null, 2)}

### Important Guidelines:
- If you don't have exact matches, suggest similar or related resources.
- Encourage users to call resources directly for current information.
- For immediate crisis, prioritize 988 or 911.

Remember: You are the hub for second chances. Be the "Google and Perplexity" for justice-impacted individuals and survivors by providing verified, structured resource information.`;

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Use Gemini Flash for resource discovery - fast and cheap
    const openRouterResponse = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 800,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text();
      console.error('OpenRouter API error:', errorData);
      errorCount++;
      
      const responseTime = Date.now() - startTime;
      try {
        await supabase.rpc('log_ai_usage', {
          p_endpoint_name: 'ai-resource-discovery',
          p_user_id: null,
          p_response_time_ms: responseTime,
          p_error_count: errorCount
        });
      } catch (logError) {
        console.error('Failed to log AI usage:', logError);
      }

      const helpfulGuidance = `I'm here to help you find Ohio resources! While my AI is temporarily unavailable, I've found ${resources?.length || 0} resources from our database that might help.

**Tips for better results:**
- Be specific about your location (city or county in Ohio)
- Mention the type of help you need (housing, employment, healthcare, legal aid, etc.)
- Include any special circumstances (justice-involved, family with children, etc.)

Here are the resources I found for you:`;

      return new Response(JSON.stringify({
        response: helpfulGuidance,
        resources: resources?.slice(0, limit) || [],
        totalFound: resources?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await openRouterResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    // Find most relevant resources to return alongside AI response
    const relevantResources = resources?.slice(0, limit) || [];

    console.log('AI Response generated successfully');

    // Check if we need web search fallback
    let webResources: any[] = [];
    const minCuratedResults = 3;
    const needsFallback = relevantResources.length < minCuratedResults;

    if (needsFallback) {
      console.log(`Only ${relevantResources.length} curated results found, triggering web search fallback`);
      
      try {
        // Build Ohio-specific search query
        let webSearchQuery = `Ohio ${query} verified organizations with phone numbers and websites`;
        if (county) {
          webSearchQuery += ` in ${county} County`;
        } else if (location) {
          webSearchQuery += ` in ${location}`;
        }
        webSearchQuery += " site:.org OR site:.gov OR site:ohio.gov";

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a resource finder for Coach Kay at The Collective. Extract contact information (name, phone, website, description) for Ohio social services and transformation support across all 88 counties. Prioritize Columbus and Franklin County if applicable. Return as structured JSON or a clear list.'
              },
              {
                role: 'user',
                content: webSearchQuery
              }
            ],
            temperature: 0.2,
            max_tokens: 1000
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          const webResponse = perplexityData.choices[0].message.content;
          
          // Parse the web response and create web resources
          webResources = [{
            name: 'Web Search Results',
            description: webResponse,
            type: 'web_search',
            verified: false,
            source: 'perplexity'
          }];
          
          console.log(`Added ${webResources.length} web search results`);
        } else {
          console.error('Perplexity API error:', await perplexityResponse.text());
        }
      } catch (webError) {
        console.error('Web search fallback error:', webError);
      }
    }

    // Log usage analytics
    const responseTime = Date.now() - startTime;
    try {
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'ai-resource-discovery',
        p_user_id: null,
        p_response_time_ms: responseTime,
        p_error_count: errorCount
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
    }

    return new Response(JSON.stringify({
      response: aiResponse,
      curatedResources: relevantResources,
      webResources: webResources,
      totalFound: resources?.length || 0,
      usedWebFallback: needsFallback && webResources.length > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI resource discovery:', error);
    errorCount++;
    
    // Log error usage analytics
    const responseTime = Date.now() - startTime;
    try {
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'ai-resource-discovery',
        p_user_id: null,
        p_response_time_ms: responseTime,
        p_error_count: errorCount
      });
    } catch (logError) {
      console.error('Failed to log AI usage error:', logError);
    }
    
    // Emergency fallback: Try to get basic resources 
    let fallbackResources = [];
    try {
      const { data: basicResources } = await supabase
        .from('resources')
        .select('*')
        .limit(10);
      fallbackResources = basicResources || [];
    } catch (dbError) {
      console.error('Fallback database error:', dbError);
    }

    const guidanceMessage = fallbackResources.length > 0 
      ? `I found ${fallbackResources.length} Ohio resources in our database. While I'm experiencing technical difficulties, these resources should help you get started. For more specific assistance, try being more detailed about your location and needs.`
      : `I'm having technical difficulties right now. Please try refreshing the page, or visit our resource directory directly to browse available Ohio services and support.`;

    return new Response(JSON.stringify({ 
      response: guidanceMessage,
      resources: fallbackResources,
      totalFound: fallbackResources.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
