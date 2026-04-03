import { serve } from "@std/http/server";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
    
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const systemPrompt = `You are a professional content writer specializing in creating compelling success stories for social services and community organizations. Your goal is to highlight positive outcomes, celebrate achievements, and inspire others while maintaining dignity and respect for all individuals.`;

    const userPrompt = `Create a compelling success story based on this information:

    Basic Information: ${basicInfo}
    ${outcome ? `Outcome: ${outcome}` : ''}
    ${participantQuote ? `Participant Quote: "${participantQuote}"` : ''}
    
    Please generate:
    1. A compelling title (under 80 characters)
    2. A full story (300-500 words)
    3. A brief summary (50-100 words) suitable for social media
    
    Return the response as a JSON object with the following structure:
    {
      "title": "...",
      "story": "...",
      "summary": "...",
      "suggestedTags": ["tag1", "tag2", "..."]
    }`;

    // Use OpenRouter for generation
    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ] as OpenRouterMessage[],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      },
      OPENROUTER_MODELS.COMPLEX_REASONING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

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
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

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

