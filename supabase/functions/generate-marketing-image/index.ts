import { serve } from "@std/http/server";
import { callOpenRouter } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
    
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Enhance prompt based on style
    const styleEnhancements = {
      professional: 'professional, clean, modern design, high quality',
      inspirational: 'inspirational, uplifting, hopeful, warm colors',
      community: 'diverse community, inclusive, welcoming, supportive environment',
      celebration: 'celebratory, joyful, achievement, success story'
    };

    const enhancedPrompt = `${prompt.substring(0, 1000)}. Style: ${styleEnhancements[safeStyle as keyof typeof styleEnhancements] || styleEnhancements.professional}. High resolution, suitable for social media and marketing materials. Include diverse representation.`;

    console.log('Generating image with prompt:', enhancedPrompt);

    // Using black-forest-labs/flux-schnell through OpenRouter for high-quality image generation
    const response = await callOpenRouter(OPENROUTER_API_KEY, {
      model: 'black-forest-labs/flux-schnell',
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ]
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    // OpenRouter for image models usually returns the image URL in the content or as a separate field
    const imageUrl = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.image_url;

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

