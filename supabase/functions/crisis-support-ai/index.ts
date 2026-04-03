import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrisisQuery {
  query: string;
  location?: string;
  county?: string;
  urgencyLevel?: 'immediate' | 'urgent' | 'moderate' | 'informational';
  previousContext?: Array<{role: string, content: string}>;
}

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 5;

async function checkRateLimit(supabase: any, identifier: string, endpoint: string): Promise<{ limited: boolean; remaining: number }> {
  try {
    const { data, error } = await supabase.rpc('check_ai_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS };
    }

    const result = data?.[0] || { is_rate_limited: false, current_count: 0 };
    return {
      limited: result.is_rate_limited,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - result.current_count)
    };
  } catch (err) {
    console.error('Rate limit error:', err);
    return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS };
  }
}

async function recordRequest(supabase: any, identifier: string, endpoint: string): Promise<void> {
  try {
    await supabase.rpc('record_ai_request', {
      p_identifier: identifier,
      p_endpoint: endpoint
    });
  } catch (err) {
    console.error('Failed to record request:', err);
  }
}

function getClientIdentifier(req: Request, authHeader: string | null): string {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) return `user:${payload.sub}`;
    } catch (e) {
      // Fall through to IP
    }
  }
  
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let errorCount = 0;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get('authorization');
    const identifier = getClientIdentifier(req, authHeader);
    const endpoint = 'crisis-support-ai';

    const rateLimit = await checkRateLimit(supabase, identifier, endpoint);
    
    if (rateLimit.limited) {
      console.log(`Rate limit exceeded for ${identifier}`);
      
      await supabase.from('audit_log').insert({
        action: 'AI_RATE_LIMIT_EXCEEDED',
        resource_type: 'ai_endpoint',
        details: { endpoint, identifier },
        severity: 'warn'
      });

      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait a few minutes before trying again.',
        supportMessage: 'For immediate crisis support, please call 988 (Suicide & Crisis Lifeline) or 911.',
        retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(RATE_LIMIT_WINDOW_MINUTES * 60)
        },
      });
    }

    await recordRequest(supabase, identifier, endpoint);

    const { query, location, county, urgencyLevel = 'moderate', previousContext = [] }: CrisisQuery = await req.json();

    // Enhanced resource filtering for crisis situations
    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%,type.ilike.%suicide%,type.ilike.%domestic violence%,type.ilike.%substance abuse%')
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

    // Crisis-specific system prompt optimized for Ohio residents
    const systemPrompt = `You are Coach Kay, the Crisis Support companion for the Healing Hub at Forward Focus Elevation, serving all 88 counties across Ohio. You specialize in immediate crisis intervention, safety planning, and connecting people with the "Healing Hub" for long-term support.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- Maintain an objective, professional, and sympathetic tone.
- Eliminate conversational filler. Provide pure, structured guidance.

### Crisis Intervention Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery process or safety assessment.
2. **Immediate Safety**: Focus on immediate safety and practical next steps.
3. **Ohio-Wide Support**: Prioritize local community resources, family justice centers, and Ohio-specific support systems across all 88 counties.
4. **Sympathy & Alertness**: Be alert to danger signs and respond with professional sympathy and actionable help.

### Available Ohio Resources
${JSON.stringify(resources?.slice(0, 10) || [])}

### Important Guidelines
- For immediate danger, prioritize 911.
- For suicide/crisis support, emphasize 988.
- For domestic violence, emphasize 1-800-799-7233.

Remember: You are the companion for second chances and healing. Be the "Google and Perplexity" for those in need by providing verified, structured resource information.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousContext,
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Use Claude Haiku for crisis - better safety alignment
    const openRouterResponse = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: messages as OpenRouterMessage[],
        max_tokens: 1000,
      },
      OPENROUTER_MODELS.CRISIS_SUPPORT,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    // Filter resources based on query context and urgency
    const relevantResources = resources?.filter(resource => {
      const queryLower = query.toLowerCase();
      const resourceName = resource.name?.toLowerCase() || '';
      const resourceDesc = resource.description?.toLowerCase() || '';
      const resourceType = resource.type?.toLowerCase() || '';
      
      if (queryLower.includes('suicide') || queryLower.includes('self-harm')) {
        return resourceType.includes('crisis') || resourceType.includes('mental health');
      }
      if (queryLower.includes('domestic violence') || queryLower.includes('abuse')) {
        return resourceType.includes('domestic violence') || resourceType.includes('crisis');
      }
      if (queryLower.includes('addiction') || queryLower.includes('substance')) {
        return resourceType.includes('substance abuse') || resourceType.includes('mental health');
      }
      
      return resourceName.includes(queryLower) || 
             resourceDesc.includes(queryLower) || 
             resourceType.includes('crisis') ||
             resourceType.includes('emergency');
    })?.slice(0, 8) || [];

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', await openRouterResponse.text());
      errorCount++;
      
      const responseTime = Date.now() - startTime;
      try {
        await supabase.rpc('log_ai_usage', {
          p_endpoint_name: 'crisis-support-ai',
          p_user_id: null,
          p_response_time_ms: responseTime,
          p_error_count: errorCount
        });
      } catch (logError) {
        console.error('Failed to log AI usage:', logError);
      }

      const compassionateResponse = `I'm here with you, and I want you to know that you're not alone. While I'm having some technical difficulties right now, your wellbeing is my priority.

**If you're in immediate danger, please call 911 right now.**

**For crisis support:**
• 988 - Suicide & Crisis Lifeline (available 24/7)
• Text HOME to 741741 - Crisis Text Line
• 1-800-799-7233 - National Domestic Violence Hotline

I'm searching for local Ohio resources that can provide you with immediate support...`;

      return new Response(JSON.stringify({
        response: compassionateResponse,
        resources: relevantResources,
        urgencyLevel,
        totalResources: resources?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await openRouterResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // Web Search Fallback (Perplexity)
    let webResources: any[] = [];
    const minResources = 2;
    if ((resources?.length || 0) < minResources) {
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
              { role: 'system', content: 'You are a crisis resource finder for Coach Kay at the Healing Hub. Find verified Ohio crisis support organizations (name, phone, website, description) across all 88 counties. Prioritize Columbus and Franklin County if applicable. Return as structured JSON or a clear list.' },
              { role: 'user', content: `Search for Ohio crisis support related to: ${query} ${location ? 'near ' + location : ''} ${county ? 'in ' + county + ' County' : ''}` }
            ],
            max_tokens: 1000
          }),
        });

        if (perplexityResponse.ok) {
          const webData = await perplexityResponse.json();
          webResources = [{
            name: 'Latest Crisis Resources',
            description: webData.choices[0].message.content,
            type: 'web_search',
            source: 'perplexity'
          }];
        }
      } catch (err) {
        console.error('Web search error:', err);
      }
    }

    // Log usage analytics
    const responseTime = Date.now() - startTime;
    try {
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'crisis-support-ai',
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
      totalResources: resources?.length || 0,
      rateLimitRemaining: rateLimit.remaining - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Crisis Support AI error:', error);
    errorCount++;
    
    const responseTime = Date.now() - startTime;
    try {
      await supabase.rpc('log_ai_usage', {
        p_endpoint_name: 'crisis-support-ai',
        p_user_id: null,
        p_response_time_ms: responseTime,
        p_error_count: errorCount
      });
    } catch (logError) {
      console.error('Failed to log AI usage error:', logError);
    }
    
    const fallbackMessage = `I am here to support you. While I am experiencing technical difficulties, your safety is the highest priority.

## Immediate Crisis Support
- **Emergency:** Call 911
- **Suicide & Crisis Lifeline:** Call 988
- **Crisis Text Line:** Text HOME to 741741
- **Domestic Violence Hotline:** Call 1-800-799-7233

I am continuing to search for local Ohio resources to assist you.`;

    let fallbackResources = [];
    try {
      const { data: dbResources } = await supabase
        .from('resources')
        .select('*')
        .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%')
        .eq('verified', true)
        .limit(5);
      fallbackResources = dbResources || [];
    } catch (dbError) {
      console.error('Fallback database error:', dbError);
    }

    return new Response(JSON.stringify({ 
      response: fallbackMessage,
      resources: fallbackResources,
      urgencyLevel: 'urgent',
      totalResources: fallbackResources.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

