-- Allow admins and managers to view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications_log FOR SELECT
USING (is_admin_or_manager(auth.uid()));

-- Add delivery_status column to track notification status
ALTER TABLE public.notifications_log 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent';

-- Add mandatory_notification column to notification_preferences to track which are required
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS mandatory_shift_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mandatory_geofence_alerts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mandatory_admin_announcements BOOLEAN DEFAULT FALSE;

-- Create table for admin-configured custom notifications
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  employee_id UUID,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  send_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scheduled_notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_notifications
CREATE POLICY "Admins can view scheduled notifications"
ON public.scheduled_notifications FOR SELECT
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can insert scheduled notifications"
ON public.scheduled_notifications FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update scheduled notifications"
ON public.scheduled_notifications FOR UPDATE
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can delete scheduled notifications"
ON public.scheduled_notifications FOR DELETE
USING (is_admin_or_manager(auth.uid()));