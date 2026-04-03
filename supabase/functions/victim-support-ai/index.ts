import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/utils.ts';
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface VictimSupportQuery {
  query: string;
  location?: string;
  county?: string;
  victimType?: 'domestic_violence' | 'sexual_assault' | 'violent_crime' | 'property_crime' | 'other';
  traumaLevel?: 'recent' | 'ongoing' | 'past' | 'complex';
  previousContext?: Array<{role: string, content: string}>;
}

type VictimSupportMessage = Pick<OpenRouterMessage, 'role' | 'content'>;

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get('authorization');
    const identifier = getClientIdentifier(req, authHeader);
    const endpoint = 'victim-support-ai';

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
        supportMessage: 'For immediate victim support, please call the National Domestic Violence Hotline at 1-800-799-7233.',
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

    const { query, location, county, victimType, traumaLevel = 'ongoing', previousContext = [] }: VictimSupportQuery = await req.json();

    if (!query || typeof query !== 'string' || query.length > 5000) {
      return new Response(JSON.stringify({ error: 'Invalid or missing query (max 5000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let resourceQuery = supabase
      .from('resources')
      .select('*')
      .or('type.ilike.%victim%,type.ilike.%legal aid%,type.ilike.%compensation%,type.ilike.%counseling%,type.ilike.%trauma%,type.ilike.%advocacy%,type.ilike.%domestic violence%,type.ilike.%sexual assault%')
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

    const systemPrompt = `You are Coach Kay, the trauma-informed navigator for the Healing Hub at Forward Focus Elevation. You serve all 88 counties across Ohio, specializing in support for crime victims and survivors.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- Maintain an objective, professional, and sympathetic tone.
- Avoid conversational filler. Provide pure, structured, and informative output.

### Core Principles
1. **Guided Interaction**: Always ask exactly ONE guided question at the end of your response to lead the user through their discovery or healing process.
2. **Trauma-Informed Care**: Acknowledge strength, validate experiences without judgment, and emphasize that what happened was not their fault.
3. **Ohio-Wide Expertise**: Provide guidance on legal rights, victim compensation, trauma counseling, and safety planning across all 88 Ohio counties.
4. **Resource Richness**: Prioritize immediate safety and verified resources. Include contact information (phone/website) for all recommendations.

### Available Ohio Resources
${JSON.stringify(resources?.slice(0, 10) || [])}

### Communication Guidelines
- Use "survivor" language when appropriate.
- Respect autonomy and provide hope while remaining realistic.
- For immediate crisis, prioritize 988 or 911.

Remember: You are the guide for healing and second chances. Be the "Google and Perplexity" for survivors by providing verified, structured resource information.`;

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousContext.filter(
        (message): message is VictimSupportMessage =>
          message.role === 'system' || message.role === 'user' || message.role === 'assistant'
      ),
      { role: 'user', content: query }
    ];

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Use Claude Haiku for victim support - trauma-informed
    const openRouterResponse = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages,
        max_tokens: 1200,
      },
      OPENROUTER_MODELS.CRISIS_SUPPORT,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', await openRouterResponse.text());
      throw new Error('Failed to generate AI response');
    }

    const aiData = await openRouterResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;
    if (!aiMessage) {
      throw new Error('AI response missing expected content');
    }

    // Web Search Fallback (Perplexity)
    let webResources: any[] = [];
    const minResources = 3;
    if ((resources?.length || 0) < minResources) {
      const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
      if (!perplexityApiKey) {
        console.warn('PERPLEXITY_API_KEY not configured, skipping web search fallback');
      } else {
        try {
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                { role: 'system', content: 'You are a victim services resource finder for Coach Kay at the Healing Hub. Find verified Ohio victim support organizations (name, phone, website, description) across all 88 counties. Prioritize Columbus and Franklin County if applicable. Return as structured JSON or a clear list.' },
                { role: 'user', content: `Search for Ohio victim support related to: ${query} ${location ? 'near ' + location : ''} ${county ? 'in ' + county + ' County' : ''}` }
              ],
              max_tokens: 1000
            }),
          });

          if (perplexityResponse.ok) {
            const webData = await perplexityResponse.json();
            const perplexityContent = webData.choices?.[0]?.message?.content;
            if (perplexityContent) {
              webResources = [{
                name: 'Latest Web Resources',
                description: perplexityContent,
                type: 'web_search',
                source: 'perplexity'
              }];
            }
          }
        } catch (err) {
          console.error('Web search error:', err);
        }
      }
    }

    // Filter resources based on victim service needs
    const relevantResources = resources?.filter(resource => {
      const queryLower = query.toLowerCase();
      const resourceName = resource.name?.toLowerCase() || '';
      const resourceDesc = resource.description?.toLowerCase() || '';
      const resourceType = resource.type?.toLowerCase() || '';
      
      if (queryLower.includes('legal') || queryLower.includes('rights') || queryLower.includes('lawyer')) {
        return resourceType.includes('legal aid') || resourceType.includes('advocacy');
      }
      if (queryLower.includes('compensation') || queryLower.includes('financial') || queryLower.includes('money')) {
        return resourceType.includes('compensation') || resourceType.includes('financial');
      }
      if (queryLower.includes('counseling') || queryLower.includes('therapy') || queryLower.includes('trauma')) {
        return resourceType.includes('counseling') || resourceType.includes('trauma') || resourceType.includes('mental health');
      }
      if (queryLower.includes('domestic violence') || queryLower.includes('abuse')) {
        return resourceType.includes('domestic violence') || resourceName.includes('domestic');
      }
      if (queryLower.includes('sexual assault') || queryLower.includes('rape')) {
        return resourceType.includes('sexual assault') || resourceName.includes('sexual');
      }
      
      return resourceName.includes(queryLower) || 
             resourceDesc.includes(queryLower) || 
             resourceType.includes('victim') ||
             resourceType.includes('advocacy');
    })?.slice(0, 8) || [];

    return new Response(JSON.stringify({
      response: aiMessage,
      resources: relevantResources,
      webResources,
      victimType,
      traumaLevel,
      totalResources: resources?.length || 0,
      rateLimitRemaining: rateLimit.remaining - 1,
      supportServices: {
        domesticViolence: "1-800-799-7233",
        sexualAssault: "1-800-656-4673", 
        crisisSupport: "988",
        ohioVictimCompensation: "https://www.ohioattorneygeneral.gov/Individuals-and-Families/Victims"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Victim Support AI error:', error);
    return new Response(JSON.stringify({ 
      error: 'I apologize for the technical difficulty. Let me connect you with local Ohio victim services and family justice centers in your area that can provide immediate support.',
      resources: [],
      supportServices: {
        domesticViolence: "1-800-799-7233",
        sexualAssault: "1-800-656-4673", 
        crisisSupport: "988"
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

