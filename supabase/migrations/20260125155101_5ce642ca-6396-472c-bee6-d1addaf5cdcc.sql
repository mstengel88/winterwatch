-- Allow employee_id to be nullable to support global/default overtime settings
ALTER TABLE public.overtime_notification_settings 
ALTER COLUMN employee_id DROP NOT NULL;

-- Add a unique constraint for the global setting (where employee_id is null)
-- This ensures only one global setting can exist
CREATE UNIQUE INDEX overtime_notification_settings_global_unique 
ON public.overtime_notification_settings ((employee_id IS NULL)) 
WHERE employee_id IS NULL;