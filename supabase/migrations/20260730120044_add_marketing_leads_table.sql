CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  service_area text,
  fleet_size text,
  customer_type text NOT NULL DEFAULT 'property_manager',
  message text,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit marketing leads" ON public.marketing_leads;
CREATE POLICY "Anyone can submit marketing leads"
  ON public.marketing_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view marketing leads" ON public.marketing_leads;
CREATE POLICY "Admins can view marketing leads"
  ON public.marketing_leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update marketing leads" ON public.marketing_leads;
CREATE POLICY "Admins can update marketing leads"
  ON public.marketing_leads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));

DROP TRIGGER IF EXISTS update_marketing_leads_updated_at ON public.marketing_leads;
CREATE TRIGGER update_marketing_leads_updated_at
  BEFORE UPDATE ON public.marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
