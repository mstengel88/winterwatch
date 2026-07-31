
-- Function to delete location pings older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_employee_locations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.employee_locations
  WHERE recorded_at < now() - interval '7 days';
$$;
