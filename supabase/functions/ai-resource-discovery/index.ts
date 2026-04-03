import "xhr";
import { serve } from "@std/http/server";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCorsPreFlight, logAiUsage, parseRequestBody, errorResponse, successResponse } from "../_shared/utils.ts";
import { checkAiRateLimit } from "../_shared/rate-limit.ts";
import { OPENROUTER_MODELS, callOpenRouterWithFallback, OpenRouterMessage } from '../_shared/openrouter.ts';

interface ResourceQuery {
  query: string;
  location?: string;
  county?: string;
  resourceType?: string;
  limit?: number;
}

const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'for', 'from', 'help', 'i', 'in', 'is', 'me', 'my', 'need', 'of', 'on', 'or', 'services', 'support', 'the', 'to', 'with'
]);

const getSearchTokens = (query: string) =>
  query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !SEARCH_STOP_WORDS.has(token));

const scoreResource = (resource: Record<string, unknown>, tokens: string[]) => {
  const text = [
    resource.name,
    resource.organization,
    resource.category,
    resource.type,
    resource.description,
    resource.city,
    resource.county,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = resource.verified ? 4 : 0;
  score += resource.justice_friendly ? 3 : 0;

  for (const token of tokens) {
    if (`${resource.name ?? ''}`.toLowerCase().includes(token)) score += 6;
    if (`${resource.category ?? ''}`.toLowerCase().includes(token)) score += 5;
    if (`${resource.type ?? ''}`.toLowerCase().includes(token)) score += 5;
    if (`${resource.description ?? ''}`.toLowerCase().includes(token)) score += 2;
    if (text.includes(token)) score += 1;
  }

  return score;
};

const buildFallbackResponse = (query: string, resources: Record<string, unknown>[], location?: string, county?: string) => {
  if (resources.length === 0) {
    return [
      `I could not find a strong match for "${query}" in our current Ohio resource directory.`,
      county || location ? `I checked resources near ${county ?? location}.` : 'I checked our current statewide directory.',
      'Try narrowing the request by county or using a specific need like housing, counseling, expungement, food, transportation, or job training.'
    ].join(' ');
  }

  const intro = county || location
    ? `## Resource matches near ${county ?? location}`
    : '## Resource matches across Ohio';

  const items = resources.slice(0, 5).map((resource) => {
    const place = [resource.city, resource.county ? `${resource.county} County` : undefined].filter(Boolean).join(', ');
    return `- **${resource.name}**${place ? ` (${place})` : ''}: ${resource.description ?? resource.type ?? resource.category ?? 'Resource details available below.'}`;
  }).join('\n');

  return `${intro}\n\n${items}\n\nWhat county or type of help should I narrow this to next?`;
};

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = undefined; // Will be set by rate limit check

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    // Rate limiting
    const rateLimit = await checkAiRateLimit(supabase, req, 'ai-resource-discovery');
    const currentUserId = rateLimit.identifier;

    if (rateLimit.limited) {
      await logAiUsage(supabase, 'ai-resource-discovery', Date.now() - startTime, 1, currentUserId);
      return errorResponse(rateLimit.message || 'Rate limit exceeded', 429);
    }

    const body = await parseRequestBody<ResourceQuery>(req);
    if (!body) return errorResponse('Missing request body', 400);
    const { query, location, county, resourceType, limit = 10 } = body;
    const tokens = getSearchTokens(query);

    // Fetch resources from database
    const { data: allResources } = await supabase
      .from('resources')
      .select('*')
      .eq('verified', true)
      .limit(100);

    const resources = (allResources || [])
      .filter((resource) => {
        if (county && !`${resource.county ?? ''}`.toLowerCase().includes(county.toLowerCase())) {
          return false;
        }

        if (location) {
          const locationText = `${resource.city ?? ''} ${resource.county ?? ''} ${resource.state ?? ''} ${resource.address ?? ''}`.toLowerCase();
          if (!locationText.includes(location.toLowerCase())) {
            return false;
          }
        }

        if (resourceType) {
          const typeText = `${resource.type ?? ''} ${resource.category ?? ''}`.toLowerCase();
          if (!typeText.includes(resourceType.toLowerCase())) {
            return false;
          }
        }

        return true;
      })
      .map((resource) => ({ resource, score: scoreResource(resource, tokens) }))
      .filter(({ score }) => score > 0 || tokens.length === 0)
      .sort((left, right) => right.score - left.score)
      .map(({ resource }) => resource);

    const curatedResources = resources.slice(0, limit);

    if (!OPENROUTER_API_KEY) {
      await logAiUsage(supabase, 'ai-resource-discovery', Date.now() - startTime, 0, currentUserId);
      return successResponse({
        response: buildFallbackResponse(query, curatedResources, location, county),
        curatedResources,
        totalFound: resources.length,
        usedWebFallback: false,
      });
    }

    const systemPrompt = `You are Coach Kay, the lead resource navigator for "The Collective" (AI & Life Transformation Hub) at Forward Focus Elevation, serving all 88 Ohio counties.

### Tone and Style
- Use clear markdown headers (##) for structure.
- Use bullet points for resource lists or action steps.
- End with exactly ONE guided question.

### Core Principles
1. **Safety First**: For immediate danger, prioritize 911. For suicide/crisis, prioritize 988.
2. **Empowerment**: Prioritize justice-friendly and verified resources.

### Available Resources Context
${JSON.stringify(resources || [])}`;

    console.log(`Processing Resource Discovery for user ${userId}`);

    const response = await callOpenRouterWithFallback(
      OPENROUTER_API_KEY,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      OPENROUTER_MODELS.CHAT_STREAMING,
      OPENROUTER_MODELS.CHAT_STANDARD
    );

    if (!response.ok) {
      await logAiUsage(supabase, 'ai-resource-discovery', Date.now() - startTime, 0, currentUserId);
      return successResponse({
        response: buildFallbackResponse(query, curatedResources, location, county),
        curatedResources,
        totalFound: resources.length,
        usedWebFallback: false,
      });
    }

    const aiData = await response.json();
    const aiMessage = aiData.choices[0].message.content;

    // Log success
    await logAiUsage(supabase, 'ai-resource-discovery', Date.now() - startTime, 0, currentUserId);

    return successResponse({
      response: aiMessage,
      curatedResources,
      totalFound: resources.length,
    });

  } catch (error) {
    console.error('Error in ai-resource-discovery:', error);
    await logAiUsage(supabase, 'ai-resource-discovery', Date.now() - startTime, 1, userId);
    return errorResponse(error instanceof Error ? error.message : 'Internal error', 500);
  }
});
