-- Add team_member_ids column to store selected team members for shovel work logs
ALTER TABLE public.shovel_work_logs
ADD COLUMN team_member_ids uuid[] DEFAULT NULL;

-- Add snow_depth_inches column for consistency with work_logs table
ALTER TABLE public.shovel_work_logs
ADD COLUMN snow_depth_inches numeric DEFAULT NULL;