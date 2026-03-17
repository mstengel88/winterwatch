-- Add 'manager' to the employee_category enum
ALTER TYPE public.employee_category ADD VALUE IF NOT EXISTS 'manager';