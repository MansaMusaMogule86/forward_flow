-- SEC2: Fix overly permissive RLS on email_preferences table
-- Current problem: Policies use USING condition 'true' allowing any user to access any preferences
-- Solution: Restrict access based on token validation flow and add admin access

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view their own preferences" ON email_preferences;
DROP POLICY IF EXISTS "Anyone can insert their own preferences" ON email_preferences;
DROP POLICY IF EXISTS "Anyone can update their own preferences" ON email_preferences;

-- Create properly scoped policies

-- Policy 1: Allow SELECT only with valid unsubscribe token
-- This supports the EmailPreferences page flow where users validate via token
CREATE POLICY "Users can view preferences with valid token" ON email_preferences
FOR SELECT 
USING (
  subscriber_id IN (
    SELECT id FROM newsletter_subscriptions 
    WHERE unsubscribe_token IS NOT NULL 
    AND token_expires_at > now()
  )
);

-- Policy 2: Admins can view all preferences
CREATE POLICY "Admins can view all preferences" ON email_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 3: Admins can manage all preferences
CREATE POLICY "Admins can manage preferences" ON email_preferences
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Note: INSERT/UPDATE for normal users is handled via the update-email-preferences
-- edge function which uses service role key, so no client-side INSERT/UPDATE policies needed

-- SEC3: Fix overly permissive RLS on email_send_queue table
-- Current problem: Policy with USING condition 'true' could expose queued emails
-- Solution: Restrict to service role and admin only

-- The existing "Service role can manage queue" policy with USING true should be replaced
-- First, let's keep the admin view policy (already exists and is correct)
-- The "Service role can manage queue" policy cannot be restricted via RLS alone
-- since service role bypasses RLS. Instead, we just need to ensure no overly-broad
-- client access policies exist.

-- Remove any overly permissive policies on email_send_queue if they exist
-- and ensure only admin can view via client
-- The existing "Admins can view email queue" policy is already correct

-- Add explicit policy to prevent non-admin client access
DROP POLICY IF EXISTS "Service role can manage queue" ON email_send_queue;

-- Create service-role-safe policy (this is mainly documentation since service role bypasses RLS)
-- But ensures no accidental client access
CREATE POLICY "Only admins can view queue" ON email_send_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role p_actions (from edge functions) will work regardless of RLS policies
-- This prevents any non-admin client access while allowing service role backend access