-- Remove the unique constraint that only allowed one global setting
DROP INDEX IF EXISTS overtime_notification_settings_global_unique;