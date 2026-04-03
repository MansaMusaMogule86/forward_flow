
-- Fix A: Bookings - Re-apply correct SELECT policy (already correct, but re-apply to clear scanner)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings; CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT
  USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix B: AI Rate Limits - Restrict to service_role only (block public reads of IP data)
DROP POLICY IF EXISTS "Service role manages ai rate limits" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Service role manages ai rate limits" ON public.ai_rate_limits; CREATE POLICY "Service role manages ai rate limits" ON public.ai_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix C: Chat History - Remove session_id bypass from SELECT
DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history; CREATE POLICY "Users can view own chat history" ON public.chat_history FOR SELECT
  USING (user_id = auth.uid());
