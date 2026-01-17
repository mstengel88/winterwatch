-- Add service_type column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN service_type text DEFAULT 'both';

-- Add comment for clarity
COMMENT ON COLUMN public.equipment.service_type IS 'Type of service this equipment is used for: plow, salt, or both';