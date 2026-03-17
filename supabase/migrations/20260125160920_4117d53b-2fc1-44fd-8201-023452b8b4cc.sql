-- Add foreign key constraint from overtime_notifications_sent to employees
ALTER TABLE public.overtime_notifications_sent
ADD CONSTRAINT overtime_notifications_sent_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;