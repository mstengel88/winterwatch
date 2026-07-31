-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert sent notifications" ON public.overtime_notifications_sent;

-- Create a more restrictive policy - only admins/managers can insert (edge function uses service role)
CREATE POLICY "Admins and managers can insert sent notifications"
  ON public.overtime_notifications_sent
  FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));