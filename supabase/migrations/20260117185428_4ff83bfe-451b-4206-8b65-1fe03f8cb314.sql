-- Add service_type column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN service_type text DEFAULT 'both';

-- Add comment for clarity
COMMENT ON COLUMN public.accounts.service_type IS 'Type of service for this account: plow, shovel, or both';