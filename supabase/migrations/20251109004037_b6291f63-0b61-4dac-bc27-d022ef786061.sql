-- Drop existing SELECT policy on bookings table
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Create restricted policy that only allows users to view their own bookings or admins to view all
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings; CREATE POLICY "Users can view own bookings" ON public.bookings 
FOR SELECT 
USING ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));