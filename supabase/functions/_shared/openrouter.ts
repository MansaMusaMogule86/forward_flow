// OpenRouter shared configuration
// Updated with reliable, cost-effective models that actually work

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model selection - verified working with this project's OpenRouter key
export const OPENROUTER_MODELS = {
  // Primary: fast, low-latency general chat
  CHAT_STREAMING: 'openai/gpt-4o-mini',

  // Standard: free model fallback target for broad availability
  CHAT_STANDARD: 'meta-llama/llama-3.1-8b-instruct:free',

  // Crisis/emergency: Claude Haiku - reliable paid option for safety
  CRISIS_SUPPORT: 'anthropic/claude-3.5-haiku',
  CRISIS_SPECIALIZED: 'anthropic/claude-3.5-haiku',

  // Complex reasoning: keep strong-but-efficient default
  COMPLEX_REASONING: 'anthropic/claude-3.5-haiku',

  // Resource discovery: reliable structured responses
  RESOURCE_DISCOVERY: 'openai/gpt-4o-mini',

  // Multiple fallbacks in order of preference
  FALLBACK_1: 'openai/gpt-4o-mini',
  FALLBACK_2: 'meta-llama/llama-3.1-8b-instruct:free',
  FALLBACK_3: 'google/gemma-2-9b-it:free',
  FALLBACK: 'openai/gpt-4o-mini',
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

function buildFallbackChain(primaryModel: string, fallbackModel?: string): string[] {
  return [...new Set([
    primaryModel,
    fallbackModel || OPENROUTER_MODELS.FALLBACK_1,
    OPENROUTER_MODELS.FALLBACK_2,
    OPENROUTER_MODELS.FALLBACK_3,
  ].filter(Boolean))];
}

function shouldSkipToNextModel(status: number, errorDetails: string): boolean {
  if (status === 402 || status === 404 || status === 408 || status === 409 || status === 429) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  const normalizedDetails = errorDetails.toLowerCase();
  return normalizedDetails.includes('model') && (
    normalizedDetails.includes('not found') ||
    normalizedDetails.includes('does not exist') ||
    normalizedDetails.includes('invalid') ||
    normalizedDetails.includes('unsupported')
  );
}

function shouldFailFast(status: number): boolean {
  return status === 401 || status === 403;
}

// Enhanced retry logic with multiple fallbacks
export async function callOpenRouterWithFallback(
  apiKey: string,
  request: Omit<OpenRouterRequest, 'model'>,
  primaryModel: string,
  fallbackModel?: string,
  maxRetries: number = 2
): Promise<Response> {
  const fallbackChain = buildFallbackChain(primaryModel, fallbackModel);

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

        if (shouldFailFast(response.status)) {
          throw new Error(`OpenRouter authentication error ${response.status}: ${errorDetails}`);
        }

        // Move to the next model when the current one is unavailable or invalid.
        if (shouldSkipToNextModel(response.status, errorDetails)) {
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
