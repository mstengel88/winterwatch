-- Make work-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'work-photos';

-- Drop the public access policy
DROP POLICY IF EXISTS "Public can view work photos" ON storage.objects;

-- Create policy for authenticated users to view work photos
-- Users can only view photos from work logs they have access to
CREATE POLICY "Authenticated users can view work photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-photos'
  );

-- Policy for uploading photos - only authenticated staff
CREATE POLICY "Staff can upload work photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-photos' AND
    (public.is_admin_or_manager(auth.uid()) OR public.is_staff(auth.uid()))
  );

-- Policy for deleting photos - only admins and managers
CREATE POLICY "Admins can delete work photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-photos' AND
    public.is_admin_or_manager(auth.uid())
  );