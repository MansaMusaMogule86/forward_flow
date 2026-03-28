// Shared utilities for Supabase Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // Hardening headers — applied to every response
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export const handleCorsPreFlight = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

export const errorResponse = (message: string, status = 500) => {
  console.error('Error response:', message);
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

export const successResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

// Optional webhook signature validation
export const verifyWebhookSignature = async (
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> => {
  // If no secret configured, skip validation (backward compatible)
  if (!secret || !signature) {
    console.warn('Webhook signature validation skipped - no secret/signature provided');
    return true;
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

    const signatureBuffer = Uint8Array.from(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(payload)
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
    }

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};
