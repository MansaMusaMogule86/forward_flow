// OpenRouter shared configuration
// Cheapest + Strongest models for our use case

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model selection based on use case - optimized for cost vs performance
// STRATEGY: Free/cheap for 95% of traffic, Claude ONLY for crisis detection
export const OPENROUTER_MODELS = {
  // Ultra-cheap, fast for general chat and streaming (FREE tier)
  CHAT_STREAMING: 'google/gemini-flash-1.5:free',
  
  // Slightly better quality for important conversations (CHEAP - $0.10/1M)
  CHAT_STANDARD: 'qwen/qwen-2.5-7b-instruct',
  
  // Crisis/emergency - ONLY use Claude for actual crisis situations
  // Safety-tuned, trauma-informed responses for vulnerable users
  CRISIS_SUPPORT: 'anthropic/claude-3-haiku',
  
  // Complex reasoning and structured output (FREE tier)
  COMPLEX_REASONING: 'google/gemini-flash-1.5:free',
  
  // Resource discovery - structured JSON output (CHEAP - $0.10/1M)
  RESOURCE_DISCOVERY: 'mistral/ministral-8b',
  
  // Fallback - always available (CHEAP)
  FALLBACK: 'qwen/qwen-2.5-7b-instruct',
};

// Pricing reference (per 1M tokens as of 2026):
// google/gemini-flash-1.5:free - $0 (free tier, rate limited) - 90% of traffic
// qwen/qwen-2.5-7b-instruct - $0.10/$0.10 (input/output) - fallback
// mistral/ministral-8b - $0.10/$0.10 - structured output
// anthropic/claude-3-haiku - $0.25/$1.25 - CRISIS ONLY (rare)
//
// HYBRID STRATEGY:
// - 90% of calls = FREE (Gemini Flash)
// - 9% of calls = CHEAP $0.10 (Qwen fallback)
// - 1% of calls = Claude (only for detected crisis situations)

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
  return fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://forward-focus-elevation.org',
      'X-Title': 'Forward Focus Elevation',
    },
    body: JSON.stringify(request),
  });
}

// Retry logic for failed requests with fallback models
export async function callOpenRouterWithFallback(
  apiKey: string,
  request: Omit<OpenRouterRequest, 'model'>,
  primaryModel: string,
  fallbackModel: string = OPENROUTER_MODELS.FALLBACK,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  // Try primary model
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await callOpenRouter(apiKey, { ...request, model: primaryModel });
      if (response.ok) return response;
      
      // If rate limited or payment required, try fallback immediately
      if (response.status === 429 || response.status === 402) {
        console.log(`Primary model ${primaryModel} unavailable, trying fallback...`);
        break;
      }
      
      lastError = new Error(`OpenRouter error: ${response.status}`);
    } catch (err) {
      lastError = err as Error;
    }
  }
  
  // Try fallback model
  console.log(`Using fallback model: ${fallbackModel}`);
  return callOpenRouter(apiKey, { ...request, model: fallbackModel });
}

