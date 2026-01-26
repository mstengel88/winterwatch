-- Add billing_status column to work_logs
ALTER TABLE public.work_logs 
ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'current';

-- Add billing_status column to shovel_work_logs
ALTER TABLE public.shovel_work_logs 
ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'current';

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_work_logs_billing_status ON public.work_logs(billing_status);
CREATE INDEX IF NOT EXISTS idx_shovel_work_logs_billing_status ON public.shovel_work_logs(billing_status);

-- Migrate existing data: billed items go to 'completed', others stay 'current'
UPDATE public.work_logs SET billing_status = 'completed' WHERE billed = true;
UPDATE public.shovel_work_logs SET billing_status = 'completed' WHERE billed = true;