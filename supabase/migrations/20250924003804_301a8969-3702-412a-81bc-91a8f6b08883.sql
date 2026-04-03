-- Fix audit_log RLS policy - add missing INSERT policy for system p_actions
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log; CREATE POLICY "System can insert audit logs" ON public.audit_log
FOR INSERT 
WITH CHECK (true);

-- Also add a policy for service role p_actions (for database functions)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log; CREATE POLICY "Service role can insert audit logs" ON public.audit_log
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR current_setting('role') = 'service_role');