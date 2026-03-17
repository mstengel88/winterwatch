-- Fix work-photos storage bucket access control
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view work photos" ON storage.objects;

-- Create restrictive policy that verifies work log ownership
CREATE POLICY "Users can view photos from accessible work logs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'work-photos' AND (
      -- Admins and managers can see all photos
      is_admin_or_manager((SELECT auth.uid())) OR
      -- Staff can see photos from their work logs (folder structure: work-logs/{workLogId}/...)
      EXISTS (
        SELECT 1 FROM public.work_logs w
        WHERE w.id::text = (string_to_array(name, '/'))[2]
        AND is_user_employee((SELECT auth.uid()), w.employee_id)
      ) OR
      -- Staff can see photos from their shovel work logs (folder structure: shovel-logs/{workLogId}/...)
      EXISTS (
        SELECT 1 FROM public.shovel_work_logs s
        WHERE s.id::text = (string_to_array(name, '/'))[2]
        AND is_user_employee((SELECT auth.uid()), s.employee_id)
      )
    )
  );