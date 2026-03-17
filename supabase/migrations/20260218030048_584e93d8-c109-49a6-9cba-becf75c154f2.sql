
-- Table to track which users have maintenance request notifications disabled
CREATE TABLE public.maintenance_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view settings"
  ON public.maintenance_notification_settings FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON public.maintenance_notification_settings FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update settings"
  ON public.maintenance_notification_settings FOR UPDATE
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can delete settings"
  ON public.maintenance_notification_settings FOR DELETE
  USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_maintenance_notification_settings_updated_at
  BEFORE UPDATE ON public.maintenance_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
