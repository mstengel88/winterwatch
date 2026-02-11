-- Create custom notification types table
CREATE TABLE public.notification_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view active notification types"
ON public.notification_types
FOR SELECT
USING (is_active = true OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can insert notification types"
ON public.notification_types
FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update notification types"
ON public.notification_types
FOR UPDATE
USING (is_admin_or_manager(auth.uid()) AND is_system = false);

CREATE POLICY "Admins and managers can delete notification types"
ON public.notification_types
FOR DELETE
USING (is_admin_or_manager(auth.uid()) AND is_system = false);

-- Insert default system types
INSERT INTO public.notification_types (name, label, description, is_system, is_mandatory) VALUES
  ('shift_status', 'Shift Status', 'Notifications about shift start and end', true, false),
  ('geofence_alert', 'Geofence Alert', 'Location-based boundary alerts', true, false),
  ('admin_announcement', 'Admin Announcement', 'General announcements from administrators', true, false);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_types_updated_at
BEFORE UPDATE ON public.notification_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();