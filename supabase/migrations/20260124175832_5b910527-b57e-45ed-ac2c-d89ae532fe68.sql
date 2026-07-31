-- Allow admins to update all notification_preferences (for setting mandatory flags)
CREATE POLICY "Admins can update all notification preferences"
ON public.notification_preferences FOR UPDATE
USING (is_admin_or_manager(auth.uid()));