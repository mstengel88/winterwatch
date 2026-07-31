-- Create table for per-employee overtime notification settings
CREATE TABLE public.overtime_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL UNIQUE,
  threshold_hours numeric NOT NULL DEFAULT 8,
  is_enabled boolean NOT NULL DEFAULT true,
  notify_employee boolean NOT NULL DEFAULT true,
  notify_admins boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Track when notifications were sent to avoid duplicates
CREATE TABLE public.overtime_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_clock_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  threshold_hours numeric NOT NULL
);

-- Enable RLS
ALTER TABLE public.overtime_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_notifications_sent ENABLE ROW LEVEL SECURITY;

-- RLS policies for overtime_notification_settings
CREATE POLICY "Admins and managers can view overtime settings"
  ON public.overtime_notification_settings
  FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can insert overtime settings"
  ON public.overtime_notification_settings
  FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update overtime settings"
  ON public.overtime_notification_settings
  FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete overtime settings"
  ON public.overtime_notification_settings
  FOR DELETE
  USING (is_admin_or_manager(auth.uid()));

-- RLS policies for overtime_notifications_sent
CREATE POLICY "Admins and managers can view sent notifications"
  ON public.overtime_notifications_sent
  FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "System can insert sent notifications"
  ON public.overtime_notifications_sent
  FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_overtime_notification_settings_updated_at
  BEFORE UPDATE ON public.overtime_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();