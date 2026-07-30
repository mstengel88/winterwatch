DROP POLICY IF EXISTS "Admins can view marketing leads" ON public.marketing_leads;
CREATE POLICY "Admins can view marketing leads"
  ON public.marketing_leads
  FOR SELECT
  TO authenticated
  USING (private.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update marketing leads" ON public.marketing_leads;
CREATE POLICY "Admins can update marketing leads"
  ON public.marketing_leads
  FOR UPDATE
  TO authenticated
  USING (private.is_admin_or_manager((SELECT auth.uid())))
  WITH CHECK (private.is_admin_or_manager((SELECT auth.uid())));
