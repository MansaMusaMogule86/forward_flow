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
    const { prompt, style = 'professional' } = await req.json();

    // Input validation
    if (!prompt || typeof prompt !== 'string' || prompt.length > 1000) {
      return new Response(JSON.stringify({ error: 'Invalid or missing prompt (max 1000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const validStyles = ['professional', 'inspirational', 'community', 'celebration'];
    const safeStyle = validStyles.includes(style) ? style : 'professional';
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Enhance prompt based on style
    const styleEnhancements = {
      professional: 'professional, clean, modern design, high quality',
      inspirational: 'inspirational, uplifting, hopeful, warm colors',
      community: 'diverse community, inclusive, welcoming, supportive environment',
      celebration: 'celebratory, joyful, achievement, success story'
    };

    const enhancedPrompt = `${prompt.substring(0, 1000)}. Style: ${styleEnhancements[safeStyle as keyof typeof styleEnhancements] || styleEnhancements.professional}. 
    High resolution, suitable for social media and marketing materials. Include diverse representation.`;

    console.log('Generating image with prompt:', enhancedPrompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
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
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ 
      imageUrl,
      prompt: enhancedPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-marketing-image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
