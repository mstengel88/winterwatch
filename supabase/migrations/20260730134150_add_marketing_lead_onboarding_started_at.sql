ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_onboarding_started_at
  ON public.marketing_leads(onboarding_started_at);
