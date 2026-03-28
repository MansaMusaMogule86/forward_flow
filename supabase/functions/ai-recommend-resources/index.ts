import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, errorResponse } from "../_shared/utils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURE: Mandatory authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Authentication required', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return errorResponse('Invalid or expired token', 401);
    }

    const { userNeeds, location, category } = await req.json();

    // Input validation
    if (!userNeeds || typeof userNeeds !== 'string' || userNeeds.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid or missing userNeeds (max 2000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (location && (typeof location !== 'string' || location.length > 200)) {
      return new Response(JSON.stringify({ error: 'Invalid location (max 200 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (category && (typeof category !== 'string' || category.length > 100)) {
      return new Response(JSON.stringify({ error: 'Invalid category (max 100 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Fetch available resources
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .eq('verified', true)
      .limit(50);

    if (error) throw error;

    // Create context for AI
    const resourceContext = resources?.map(r => 
      `${r.name}: ${r.description} (Category: ${r.category}, Location: ${r.city}, ${r.state})`
    ).join('\n');

    const systemPrompt = `You are an expert resource recommendation assistant for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation,
    helping individuals find the best community and AI transformation resources for their needs. You have access to a database of
    verified resources. Analyze the user's needs and recommend the 3-5 most relevant resources with explanations.`;

    const userPrompt = `User needs: ${userNeeds}
    ${location ? `Location: ${location}` : ''}
    ${category ? `Preferred category: ${category}` : ''}
    
    Available resources:
    ${resourceContext}
    
    Please recommend the best 3-5 resources and explain why each would be helpful. Format as JSON with structure:
    {
      "recommendations": [
        {
          "resourceName": "name",
          "reason": "why this is recommended",
          "matchScore": 0-100
        }
      ],
      "summary": "brief summary of recommendations"
    }`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'recommend_resources',
            description: 'Provide resource recommendations',
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
        tool_choice: { type: 'function', function: { name: 'recommend_resources' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service requires payment. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const result = JSON.parse(toolCall.function.arguments);

    console.log('AI recommendations generated for user:', user.id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in ai-recommend-resources:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
