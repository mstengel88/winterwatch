ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS converted_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_converted_organization_id
  ON public.marketing_leads(converted_organization_id);
