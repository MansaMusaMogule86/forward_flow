import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { basicInfo, outcome, participantQuote } = await req.json();

    // Input validation
    if (!basicInfo || typeof basicInfo !== 'string' || basicInfo.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid or missing basicInfo (max 2000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (outcome && (typeof outcome !== 'string' || outcome.length > 1000)) {
      return new Response(JSON.stringify({ error: 'Invalid outcome (max 1000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (participantQuote && (typeof participantQuote !== 'string' || participantQuote.length > 1000)) {
      return new Response(JSON.stringify({ error: 'Invalid participantQuote (max 1000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = `You are a professional content writer specializing in creating compelling success 
    stories for social services and community organizations. Your goal is to highlight positive outcomes, 
    celebrate achievements, and inspire others while maintaining dignity and respect for all individuals.`;

    const userPrompt = `Create a compelling success story based on this information:

    Basic Information: ${basicInfo}
    ${outcome ? `Outcome: ${outcome}` : ''}
    ${participantQuote ? `Participant Quote: "${participantQuote}"` : ''}
    
    Please generate:
    1. A compelling title (under 80 characters)
    2. A full story (300-500 words) that:
       - Has an engaging opening
       - Describes the journey and challenges
       - Highlights the intervention and support received
       - Celebrates the outcome and impact
       - Ends with hope and inspiration
    3. A brief summary (50-100 words) suitable for social media
    
    Format as JSON with structure:
    {
      "title": "title here",
      "story": "full story here",
      "summary": "brief summary here",
      "suggestedTags": ["tag1", "tag2", "tag3"]
    }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            name: 'generate_story_content',
            description: 'Generate success story content',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                story: { type: 'string' },
                summary: { type: 'string' },
                suggestedTags: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['title', 'story', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_story_content' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service requires payment. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const result = JSON.parse(toolCall.function.arguments);

    console.log('AI story generated');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-success-story:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
