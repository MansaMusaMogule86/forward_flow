-- Drop the overly permissive policy that allows anyone to update any subscription
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions;

-- Create a properly scoped policy that only allows users to update their own subscriptions
-- by matching the subscription email with the authenticated user's profile email
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscriptions; CREATE POLICY "Users can update own subscription" ON public.newsletter_subscriptions FOR UPDATE
USING (
  email IN (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  )
);