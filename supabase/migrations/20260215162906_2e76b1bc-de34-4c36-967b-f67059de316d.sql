
CREATE OR REPLACE FUNCTION public.cleanup_old_employee_locations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.employee_locations
  WHERE time_clock_id IN (
    SELECT id FROM public.time_clock
    WHERE clock_out_time IS NOT NULL
      AND clock_out_time < now() - interval '1 day'
  );
$$;
