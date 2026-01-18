-- Add billed column to work_logs
ALTER TABLE public.work_logs ADD COLUMN billed boolean NOT NULL DEFAULT false;

-- Add billed column to shovel_work_logs
ALTER TABLE public.shovel_work_logs ADD COLUMN billed boolean NOT NULL DEFAULT false;

-- Create index for faster filtering on billed status
CREATE INDEX idx_work_logs_billed ON public.work_logs(billed);
CREATE INDEX idx_shovel_work_logs_billed ON public.shovel_work_logs(billed);