// Shared utilities for Supabase Edge Functions
// Optimized for premium error handling and CORS support

/**
 * Standardized CORS Headers with Hardening
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  // Hardening headers — applied to every response
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Unified CORS Preflight Handler
 */
export const handleCorsPreFlight = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  return null;
};

/**
 * Standardized Error Response with Proper Logging
 */
export const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(`[Edge Function ERROR] ${status}: ${message}`, details || '');
  return new Response(
    JSON.stringify({ 
      error: message,
      status,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

/**
 * Standardized Success Response
 */
export const successResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

/**
 * Webhook signature validation utility
 */
export const verifyWebhookSignature = async (
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> => {
  if (!secret || !signature) {
    console.warn('[Security] Webhook validation bypassed — missing secret or signature');
    return !Deno.env.get('STRICT_WEBHOOK_VERIFICATION');
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Parse hex signature
    const signatureBuffer = Uint8Array.from(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error('[Security] Signature verification failed unexpectedly:', error);
    return false;
  }
};

/**
 * Helper to parse and validate request JSON
 */
export const parseRequestBody = async <T>(req: Request): Promise<T | null> => {
  try {
    return await req.json();
  } catch (e) {
    console.warn('[Request] Failed to parse JSON body');
    return null;
  }
};

