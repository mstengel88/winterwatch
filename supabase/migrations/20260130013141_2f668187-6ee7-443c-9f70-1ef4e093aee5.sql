-- Add billing_status column to time_clock table for shift billing workflow
ALTER TABLE public.time_clock 
ADD COLUMN billing_status text NOT NULL DEFAULT 'current';

-- Add index for better query performance on billing_status
CREATE INDEX idx_time_clock_billing_status ON public.time_clock(billing_status);