-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscribers;

-- Create a restricted policy that only allows admins to update subscriptions
DROP POLICY IF EXISTS "Only admins can update subscriptions" ON public.newsletter_subscribers; CREATE POLICY "Only admins can update subscriptions" ON public.newsletter_subscribers 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));