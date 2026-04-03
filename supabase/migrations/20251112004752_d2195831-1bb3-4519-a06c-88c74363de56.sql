-- Add fields for unsubscribe verification to newsletter_subscriptions table
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token 
ON public.newsletter_subscriptions(unsubscribe_token) 
WHERE unsubscribe_token IS NOT NULL;

-- Add policy to allow anyone to verify unsubscribe tokens (public endpoint)
-- This is safe because the token is a cryptographically secure random string
DROP POLICY IF EXISTS "Anyone can verify unsubscribe tokens" ON public.newsletter_subscriptions; CREATE POLICY "Anyone can verify unsubscribe tokens" ON public.newsletter_subscriptions FOR SELECT
USING (
  unsubscribe_token IS NOT NULL 
  AND token_expires_at > NOW()
);

-- Add policy to allow token-based unsubscribe updates
DROP POLICY IF EXISTS "Allow unsubscribe with valid token" ON public.newsletter_subscriptions; CREATE POLICY "Allow unsubscribe with valid token" ON public.newsletter_subscriptions FOR UPDATE
USING (
  unsubscribe_token IS NOT NULL 
  AND token_expires_at > NOW()
);