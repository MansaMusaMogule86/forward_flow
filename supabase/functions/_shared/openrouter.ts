// OpenRouter shared configuration
// Updated with reliable, cost-effective models that actually work

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model selection - RELIABLE options on OpenRouter
// Prioritizing models that are consistently available
export const OPENROUTER_MODELS = {
  // Primary: Google's Gemma 3 4B - reliable free tier, fast
  CHAT_STREAMING: 'google/gemma-3-4b-it:free',
  
  // Standard: Mistral 7B Instruct - good instruction following
  CHAT_STANDARD: 'mistralai/mistral-7b-instruct:free',
  
  // Crisis/emergency: Claude Haiku - reliable paid option for safety
  CRISIS_SUPPORT: 'anthropic/claude-3-haiku',
  CRISIS_SPECIALIZED: 'anthropic/claude-3-haiku',
  
  // Complex reasoning: Use Gemma or Mistral
  COMPLEX_REASONING: 'google/gemma-3-4b-it:free',
  
  // Resource discovery: Mistral is good at structured output
  RESOURCE_DISCOVERY: 'mistralai/mistral-7b-instruct:free',
  
  // Multiple fallbacks in order of preference
  FALLBACK_1: 'mistralai/mistral-7b-instruct:free',
  FALLBACK_2: 'google/gemma-3-4b-it:free',
  FALLBACK_3: 'gryphe/mythomax-l2-13b:free',
  FALLBACK: 'mistralai/mistral-7b-instruct:free',
};

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
  response_format?: { type: 'json_object' };
}

export async function callOpenRouter(
  apiKey: string,
  request: OpenRouterRequest
): Promise<Response> {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://forward-focus-elevation.org',
      'X-Title': 'Forward Focus Elevation',
    },
    body: JSON.stringify(request),
  });
  
  return response;
}

// Enhanced retry logic with multiple fallbacks
export async function callOpenRouterWithFallback(
  apiKey: string,
  request: Omit<OpenRouterRequest, 'model'>,
  primaryModel: string,
  fallbackModel?: string,
  maxRetries: number = 2
): Promise<Response> {
  const fallbackChain = [
    primaryModel,
    fallbackModel || OPENROUTER_MODELS.FALLBACK_1,
    OPENROUTER_MODELS.FALLBACK_2,
    OPENROUTER_MODELS.FALLBACK_3,
  ];
  
  let lastError: Error | null = null;
  
  // Try each model in the chain
  for (const model of fallbackChain) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[OpenRouter] Trying model: ${model} (attempt ${i + 1}/${maxRetries})`);
        
        const response = await callOpenRouter(apiKey, { ...request, model });
        
        if (response.ok) {
          console.log(`[OpenRouter] Success with model: ${model}`);
          return response;
        }
        
        // Try to parse error for better debugging
        let errorDetails = '';
        try {
          const errorData = await response.clone().json();
          errorDetails = JSON.stringify(errorData);
        } catch {
          errorDetails = await response.clone().text();
        }
        
        console.error(`[OpenRouter] Model ${model} failed with status ${response.status}: ${errorDetails}`);
        
        // If rate limited (429) or payment required (402), move to next model immediately
        if (response.status === 429 || response.status === 402) {
          console.log(`[OpenRouter] Model ${model} unavailable, trying next...`);
          break;
        }
        
        // For other errors, retry same model
        lastError = new Error(`OpenRouter error ${response.status}: ${errorDetails}`);
      } catch (err) {
        console.error(`[OpenRouter] Network error with model ${model}:`, err);
        lastError = err as Error;
      }
      
      // Small delay before retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // All models failed
  throw lastError || new Error('All OpenRouter models failed');
}
