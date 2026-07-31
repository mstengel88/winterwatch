
-- 1. Add 'trucker' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trucker';

-- 2. Add 'trucker' to the employee_category enum
ALTER TYPE public.employee_category ADD VALUE IF NOT EXISTS 'trucker';

-- 3. Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  problem_description text NOT NULL,
  mileage numeric,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
-- Truckers can insert their own requests
CREATE POLICY "Truckers can insert their own maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (
  is_admin_or_manager(auth.uid())
  OR is_user_employee(auth.uid(), employee_id)
);

-- Truckers can view their own requests
CREATE POLICY "Users can view their own maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (
  is_admin_or_manager(auth.uid())
  OR is_user_employee(auth.uid(), employee_id)
);

-- Truckers can update their own requests
CREATE POLICY "Users can update their own maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (
  is_admin_or_manager(auth.uid())
  OR is_user_employee(auth.uid(), employee_id)
)
WITH CHECK (
  is_admin_or_manager(auth.uid())
  OR is_user_employee(auth.uid(), employee_id)
);

-- Admins can delete
CREATE POLICY "Admins can delete maintenance requests"
ON public.maintenance_requests
FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- 6. Auto-update updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Audit trigger
CREATE TRIGGER audit_maintenance_requests
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();
