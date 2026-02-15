
-- Table to store periodic GPS pings from employees while on shift
CREATE TABLE public.employee_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  time_clock_id uuid NOT NULL REFERENCES public.time_clock(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by employee and recency
CREATE INDEX idx_employee_locations_employee_id ON public.employee_locations(employee_id);
CREATE INDEX idx_employee_locations_recorded_at ON public.employee_locations(recorded_at DESC);
CREATE INDEX idx_employee_locations_time_clock_id ON public.employee_locations(time_clock_id);

-- Enable RLS
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own location pings
CREATE POLICY "Users can insert their own location pings"
ON public.employee_locations
FOR INSERT
WITH CHECK (
  is_admin_or_manager((SELECT auth.uid()))
  OR is_user_employee((SELECT auth.uid()), employee_id)
);

-- Admins/managers can view all locations
CREATE POLICY "Admins and managers can view all locations"
ON public.employee_locations
FOR SELECT
USING (is_admin_or_manager((SELECT auth.uid())));

-- Staff can view their own locations
CREATE POLICY "Users can view their own locations"
ON public.employee_locations
FOR SELECT
USING (is_user_employee((SELECT auth.uid()), employee_id));

-- Admins can delete old location data
CREATE POLICY "Admins can delete location data"
ON public.employee_locations
FOR DELETE
USING (is_admin_or_manager((SELECT auth.uid())));
