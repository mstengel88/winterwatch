-- Schedule the check-overtime function to run every 5 minutes
SELECT cron.schedule(
  'check-overtime-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://caegybyfdkmgjrygnavg.supabase.co/functions/v1/check-overtime',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZWd5YnlmZGttZ2pyeWduYXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDE3ODgsImV4cCI6MjA4NDE3Nzc4OH0.Zuj1X59yETraE9nhyzYKUwSjmJZzGp1eKvtcqyr3D6o"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);