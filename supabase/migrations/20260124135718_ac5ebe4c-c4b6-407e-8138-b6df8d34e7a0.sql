-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
  'shift_status',
  'geofence_alert', 
  'admin_announcement'
);

-- Create notification_sound enum
CREATE TYPE notification_sound AS ENUM (
  'default',
  'chime',
  'bell',
  'alert',
  'none'
);

-- Create push_device_tokens table to store OneSignal player IDs
CREATE TABLE public.push_device_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id)
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  shift_status_enabled BOOLEAN NOT NULL DEFAULT true,
  geofence_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  admin_announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sound notification_sound NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications_log table to track sent notifications
CREATE TABLE public.notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  onesignal_id TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_device_tokens
CREATE POLICY "Users can view their own device tokens"
ON public.push_device_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
ON public.push_device_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
ON public.push_device_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
ON public.push_device_tokens FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for notifications_log
CREATE POLICY "Users can view their own notifications"
ON public.notifications_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON public.notifications_log FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark read)"
ON public.notifications_log FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at on push_device_tokens
CREATE TRIGGER update_push_device_tokens_updated_at
BEFORE UPDATE ON public.push_device_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();