-- =====================================================
-- MULTI-TENANT FOUNDATION
-- Adds organization scoping to the existing WinterWatch schema
-- while keeping the current app flows working during rollout.
-- =====================================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  plan text NOT NULL DEFAULT 'launch',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

INSERT INTO public.organizations (name, slug, status, plan)
SELECT 'WinterWatch Default', 'winterwatch-default', 'active', 'launch'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);

-- 2. Add organization columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id uuid;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.employee_locations
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.maintenance_notification_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.notification_types
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.notifications_log
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.overtime_notification_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.overtime_notifications_sent
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.push_device_tokens
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.scheduled_notifications
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.shovel_work_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.time_clock
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.work_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 3. Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_active_organization_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_active_organization_id_fkey
      FOREIGN KEY (active_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_organization_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_organization_id_fkey'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_locations_organization_id_fkey'
  ) THEN
    ALTER TABLE public.employee_locations
      ADD CONSTRAINT employee_locations_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_organization_id_fkey'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipment_organization_id_fkey'
  ) THEN
    ALTER TABLE public.equipment
      ADD CONSTRAINT equipment_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE public.maintenance_logs
      ADD CONSTRAINT maintenance_logs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_notification_settings_organization_id_fkey'
  ) THEN
    ALTER TABLE public.maintenance_notification_settings
      ADD CONSTRAINT maintenance_notification_settings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_organization_id_fkey'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD CONSTRAINT maintenance_requests_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_organization_id_fkey'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_types_organization_id_fkey'
  ) THEN
    ALTER TABLE public.notification_types
      ADD CONSTRAINT notification_types_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_log_organization_id_fkey'
  ) THEN
    ALTER TABLE public.notifications_log
      ADD CONSTRAINT notifications_log_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'overtime_notification_settings_organization_id_fkey'
  ) THEN
    ALTER TABLE public.overtime_notification_settings
      ADD CONSTRAINT overtime_notification_settings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'overtime_notifications_sent_organization_id_fkey'
  ) THEN
    ALTER TABLE public.overtime_notifications_sent
      ADD CONSTRAINT overtime_notifications_sent_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_device_tokens_organization_id_fkey'
  ) THEN
    ALTER TABLE public.push_device_tokens
      ADD CONSTRAINT push_device_tokens_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_notifications_organization_id_fkey'
  ) THEN
    ALTER TABLE public.scheduled_notifications
      ADD CONSTRAINT scheduled_notifications_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shovel_work_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE public.shovel_work_logs
      ADD CONSTRAINT shovel_work_logs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_clock_organization_id_fkey'
  ) THEN
    ALTER TABLE public.time_clock
      ADD CONSTRAINT time_clock_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE public.work_logs
      ADD CONSTRAINT work_logs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 4. Constraint updates for org-scoped uniqueness
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_org_user_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_org_user_role_key UNIQUE (organization_id, user_id, role);
  END IF;
END
$$;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_org_user_key'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_org_user_key UNIQUE (organization_id, user_id);
  END IF;
END
$$;

ALTER TABLE public.maintenance_notification_settings
  DROP CONSTRAINT IF EXISTS maintenance_notification_settings_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_notification_settings_org_user_key'
  ) THEN
    ALTER TABLE public.maintenance_notification_settings
      ADD CONSTRAINT maintenance_notification_settings_org_user_key UNIQUE (organization_id, user_id);
  END IF;
END
$$;

-- 5. Backfill current data into the default org
UPDATE public.profiles
SET active_organization_id = COALESCE(
  active_organization_id,
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE active_organization_id IS NULL;

UPDATE public.user_roles ur
SET organization_id = COALESCE(
  ur.organization_id,
  (SELECT p.active_organization_id FROM public.profiles p WHERE p.id = ur.user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE ur.organization_id IS NULL;

UPDATE public.employees e
SET organization_id = COALESCE(
  e.organization_id,
  (SELECT p.active_organization_id FROM public.profiles p WHERE p.id = e.user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE e.organization_id IS NULL;

UPDATE public.accounts
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = client_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.equipment
SET organization_id = COALESCE(
  organization_id,
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.work_logs wl
SET organization_id = COALESCE(
  wl.organization_id,
  (SELECT a.organization_id FROM public.accounts a WHERE a.id = wl.account_id),
  (SELECT e.organization_id FROM public.employees e WHERE e.id = wl.employee_id),
  (SELECT eq.organization_id FROM public.equipment eq WHERE eq.id = wl.equipment_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE wl.organization_id IS NULL;

UPDATE public.shovel_work_logs swl
SET organization_id = COALESCE(
  swl.organization_id,
  (SELECT a.organization_id FROM public.accounts a WHERE a.id = swl.account_id),
  (SELECT e.organization_id FROM public.employees e WHERE e.id = swl.employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE swl.organization_id IS NULL;

UPDATE public.time_clock tc
SET organization_id = COALESCE(
  tc.organization_id,
  (SELECT e.organization_id FROM public.employees e WHERE e.id = tc.employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE tc.organization_id IS NULL;

UPDATE public.employee_locations el
SET organization_id = COALESCE(
  el.organization_id,
  (SELECT tc.organization_id FROM public.time_clock tc WHERE tc.id = el.time_clock_id),
  (SELECT e.organization_id FROM public.employees e WHERE e.id = el.employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE el.organization_id IS NULL;

UPDATE public.maintenance_requests mr
SET organization_id = COALESCE(
  mr.organization_id,
  (SELECT eq.organization_id FROM public.equipment eq WHERE eq.id = mr.equipment_id),
  (SELECT e.organization_id FROM public.employees e WHERE e.id = mr.employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE mr.organization_id IS NULL;

UPDATE public.maintenance_logs ml
SET organization_id = COALESCE(
  ml.organization_id,
  (SELECT eq.organization_id FROM public.equipment eq WHERE eq.id = ml.equipment_id),
  (SELECT e.organization_id FROM public.employees e WHERE e.id = ml.performed_by_employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE ml.organization_id IS NULL;

UPDATE public.push_device_tokens
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.notification_preferences
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.notifications_log
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.maintenance_notification_settings
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.overtime_notification_settings
SET organization_id = COALESCE(
  organization_id,
  (SELECT organization_id FROM public.employees WHERE id = employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.overtime_notifications_sent
SET organization_id = COALESCE(
  organization_id,
  (SELECT organization_id FROM public.time_clock WHERE id = time_clock_id),
  (SELECT organization_id FROM public.employees WHERE id = employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.notification_types
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = created_by),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.scheduled_notifications
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = created_by),
  (SELECT organization_id FROM public.employees WHERE id = employee_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.audit_logs
SET organization_id = COALESCE(
  organization_id,
  (SELECT active_organization_id FROM public.profiles WHERE id = user_id),
  (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
)
WHERE organization_id IS NULL;

-- 6. Make organization columns required on business data
ALTER TABLE public.user_roles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.employee_locations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.equipment ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.maintenance_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.maintenance_notification_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.maintenance_requests ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notification_preferences ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notification_types ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notifications_log ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.overtime_notification_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.overtime_notifications_sent ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.push_device_tokens ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.scheduled_notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.shovel_work_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.time_clock ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.work_logs ALTER COLUMN organization_id SET NOT NULL;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_active_org ON public.profiles(active_organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON public.accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_locations_org ON public.employee_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org ON public.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_org ON public.maintenance_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_notification_settings_org ON public.maintenance_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_org ON public.maintenance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_org ON public.notification_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_types_org ON public.notification_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_org ON public.notifications_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_overtime_notification_settings_org ON public.overtime_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_overtime_notifications_sent_org ON public.overtime_notifications_sent(organization_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_org ON public.push_device_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_org ON public.scheduled_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_shovel_work_logs_org ON public.shovel_work_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_org ON public.time_clock(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_org ON public.work_logs(organization_id);

-- 8. Organization helpers
CREATE OR REPLACE FUNCTION public.current_organization_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.active_organization_id FROM public.profiles p WHERE p.id = _user_id),
    (SELECT ur.organization_id FROM public.user_roles ur WHERE ur.user_id = _user_id ORDER BY ur.created_at LIMIT 1),
    (SELECT o.id FROM public.organizations o ORDER BY o.created_at LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN NULL
    ELSE public.current_organization_id_for_user((SELECT auth.uid()))
  END
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_organization(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN false
    ELSE public.user_belongs_to_organization((SELECT auth.uid()), _organization_id)
  END
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _organization_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager_in_org(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role IN ('admin', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_in_org(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role IN ('driver', 'dispatch_driver', 'shovel_crew', 'trucker', 'work_log_viewer')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_in_org(_user_id, public.current_organization_id_for_user(_user_id), _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_manager_in_org(_user_id, public.current_organization_id_for_user(_user_id))
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_in_org(_user_id, public.current_organization_id_for_user(_user_id))
$$;

CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE user_id = _user_id
    AND organization_id = public.current_organization_id_for_user(_user_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_user_employee(_user_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = _employee_id
      AND user_id = _user_id
      AND organization_id = public.current_organization_id_for_user(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.organization_id_for_employee(_employee_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.employees
  WHERE id = _employee_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.organization_id_for_account(_account_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.accounts
  WHERE id = _account_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.organization_id_for_equipment(_equipment_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.equipment
  WHERE id = _equipment_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.organization_id_for_time_clock(_time_clock_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.time_clock
  WHERE id = _time_clock_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_shares_current_organization(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles viewer
    JOIN public.user_roles target
      ON target.organization_id = viewer.organization_id
    WHERE viewer.user_id = (SELECT auth.uid())
      AND target.user_id = _target_user_id
      AND viewer.organization_id = public.current_organization_id()
  )
$$;

-- 9. Automatic org assignment
CREATE OR REPLACE FUNCTION public.assign_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb := to_jsonb(NEW);
  v_default_org uuid := (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1);
  v_user_id uuid := NULLIF(payload->>'user_id', '')::uuid;
  v_employee_id uuid := NULLIF(payload->>'employee_id', '')::uuid;
  v_account_id uuid := NULLIF(payload->>'account_id', '')::uuid;
  v_equipment_id uuid := NULLIF(payload->>'equipment_id', '')::uuid;
  v_time_clock_id uuid := NULLIF(payload->>'time_clock_id', '')::uuid;
  v_created_by uuid := NULLIF(payload->>'created_by', '')::uuid;
  v_performed_by_employee_id uuid := NULLIF(payload->>'performed_by_employee_id', '')::uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'user_roles' THEN
    NEW.organization_id := COALESCE(
      public.current_organization_id_for_user(NEW.user_id),
      public.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'accounts' THEN
    NEW.organization_id := COALESCE(
      public.current_organization_id_for_user(NEW.client_id),
      public.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'employees' THEN
    NEW.organization_id := COALESCE(
      public.current_organization_id_for_user(NEW.user_id),
      public.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  NEW.organization_id := COALESCE(
    CASE
      WHEN v_account_id IS NOT NULL THEN public.organization_id_for_account(v_account_id)
      ELSE NULL
    END,
    CASE
      WHEN v_employee_id IS NOT NULL THEN public.organization_id_for_employee(v_employee_id)
      ELSE NULL
    END,
    CASE
      WHEN v_equipment_id IS NOT NULL THEN public.organization_id_for_equipment(v_equipment_id)
      ELSE NULL
    END,
    CASE
      WHEN v_time_clock_id IS NOT NULL THEN public.organization_id_for_time_clock(v_time_clock_id)
      ELSE NULL
    END,
    CASE
      WHEN v_performed_by_employee_id IS NOT NULL THEN public.organization_id_for_employee(v_performed_by_employee_id)
      ELSE NULL
    END,
    CASE
      WHEN v_user_id IS NOT NULL THEN public.current_organization_id_for_user(v_user_id)
      ELSE NULL
    END,
    CASE
      WHEN v_created_by IS NOT NULL THEN public.current_organization_id_for_user(v_created_by)
      ELSE NULL
    END,
    public.current_organization_id(),
    v_default_org
  );

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_active_organization_from_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET active_organization_id = COALESCE(active_organization_id, NEW.organization_id)
  WHERE id = NEW.user_id;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS set_accounts_organization_id ON public.accounts;
CREATE TRIGGER set_accounts_organization_id
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_audit_logs_organization_id ON public.audit_logs;
CREATE TRIGGER set_audit_logs_organization_id
  BEFORE INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_employee_locations_organization_id ON public.employee_locations;
CREATE TRIGGER set_employee_locations_organization_id
  BEFORE INSERT OR UPDATE ON public.employee_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_employees_organization_id ON public.employees;
CREATE TRIGGER set_employees_organization_id
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_equipment_organization_id ON public.equipment;
CREATE TRIGGER set_equipment_organization_id
  BEFORE INSERT OR UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_maintenance_logs_organization_id ON public.maintenance_logs;
CREATE TRIGGER set_maintenance_logs_organization_id
  BEFORE INSERT OR UPDATE ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_maintenance_notification_settings_organization_id ON public.maintenance_notification_settings;
CREATE TRIGGER set_maintenance_notification_settings_organization_id
  BEFORE INSERT OR UPDATE ON public.maintenance_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_maintenance_requests_organization_id ON public.maintenance_requests;
CREATE TRIGGER set_maintenance_requests_organization_id
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_notification_preferences_organization_id ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_organization_id
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_notification_types_organization_id ON public.notification_types;
CREATE TRIGGER set_notification_types_organization_id
  BEFORE INSERT OR UPDATE ON public.notification_types
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_notifications_log_organization_id ON public.notifications_log;
CREATE TRIGGER set_notifications_log_organization_id
  BEFORE INSERT OR UPDATE ON public.notifications_log
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_overtime_notification_settings_organization_id ON public.overtime_notification_settings;
CREATE TRIGGER set_overtime_notification_settings_organization_id
  BEFORE INSERT OR UPDATE ON public.overtime_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_overtime_notifications_sent_organization_id ON public.overtime_notifications_sent;
CREATE TRIGGER set_overtime_notifications_sent_organization_id
  BEFORE INSERT OR UPDATE ON public.overtime_notifications_sent
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_push_device_tokens_organization_id ON public.push_device_tokens;
CREATE TRIGGER set_push_device_tokens_organization_id
  BEFORE INSERT OR UPDATE ON public.push_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_scheduled_notifications_organization_id ON public.scheduled_notifications;
CREATE TRIGGER set_scheduled_notifications_organization_id
  BEFORE INSERT OR UPDATE ON public.scheduled_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_shovel_work_logs_organization_id ON public.shovel_work_logs;
CREATE TRIGGER set_shovel_work_logs_organization_id
  BEFORE INSERT OR UPDATE ON public.shovel_work_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_time_clock_organization_id ON public.time_clock;
CREATE TRIGGER set_time_clock_organization_id
  BEFORE INSERT OR UPDATE ON public.time_clock
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_user_roles_organization_id ON public.user_roles;
CREATE TRIGGER set_user_roles_organization_id
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS set_work_logs_organization_id ON public.work_logs;
CREATE TRIGGER set_work_logs_organization_id
  BEFORE INSERT OR UPDATE ON public.work_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS sync_profile_active_organization_after_role_write ON public.user_roles;
CREATE TRIGGER sync_profile_active_organization_after_role_write
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_active_organization_from_role();

-- 10. Audit function update to stamp organization_id
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  changed_fields text[];
  user_id_val uuid;
  user_email_val text;
  record_id_val text;
  organization_id_val uuid;
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NOT NULL THEN
    SELECT email INTO user_email_val
    FROM auth.users
    WHERE id = user_id_val;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    record_id_val := NEW.id::text;
    organization_id_val := COALESCE(
      NULLIF(new_data->>'organization_id', '')::uuid,
      public.current_organization_id_for_user(user_id_val),
      (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
    );

    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_fields,
      user_id,
      user_email,
      organization_id
    )
    VALUES (
      TG_TABLE_NAME,
      record_id_val,
      TG_OP,
      NULL,
      new_data,
      NULL,
      user_id_val,
      user_email_val,
      organization_id_val
    );

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    record_id_val := NEW.id::text;
    organization_id_val := COALESCE(
      NULLIF(new_data->>'organization_id', '')::uuid,
      NULLIF(old_data->>'organization_id', '')::uuid,
      public.current_organization_id_for_user(user_id_val),
      (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
    );

    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(old_data)
    WHERE old_data->key IS DISTINCT FROM new_data->key;

    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        user_id,
        user_email,
        organization_id
      )
      VALUES (
        TG_TABLE_NAME,
        record_id_val,
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        user_id_val,
        user_email_val,
        organization_id_val
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    record_id_val := OLD.id::text;
    organization_id_val := COALESCE(
      NULLIF(old_data->>'organization_id', '')::uuid,
      public.current_organization_id_for_user(user_id_val),
      (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
    );

    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_fields,
      user_id,
      user_email,
      organization_id
    )
    VALUES (
      TG_TABLE_NAME,
      record_id_val,
      TG_OP,
      old_data,
      NULL,
      NULL,
      user_id_val,
      user_email_val,
      organization_id_val
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 11. RLS
DROP POLICY IF EXISTS "Users can view organizations in their org scope" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations in their org scope" ON public.organizations;

CREATE POLICY "Users can view organizations in their org scope"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.can_access_organization(id));

CREATE POLICY "Admins can manage organizations in their org scope"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager_in_org((SELECT auth.uid()), id))
  WITH CHECK (public.is_admin_or_manager_in_org((SELECT auth.uid()), id));

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their active organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their active organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.user_shares_current_organization(id)
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      active_organization_id IS NULL
      OR public.user_belongs_to_organization(auth.uid(), active_organization_id)
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (
      active_organization_id IS NULL
      OR public.user_belongs_to_organization(auth.uid(), active_organization_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role insert restrictions" ON public.user_roles;
DROP POLICY IF EXISTS "Role update restrictions" ON public.user_roles;
DROP POLICY IF EXISTS "Role delete restrictions" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in current organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles in current organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in current organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in current organization" ON public.user_roles;

CREATE POLICY "Users can view roles in current organization"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.can_access_organization(organization_id));

CREATE POLICY "Admins can insert roles in current organization"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can update roles in current organization"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can delete roles in current organization"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Staff and managers can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and managers can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and managers can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and managers can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees in current organization" ON public.employees;

CREATE POLICY "Users can view employees in current organization"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_staff_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), id)
    )
  );

CREATE POLICY "Admins and managers can insert employees"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update employees"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can delete employees"
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Staff and managers can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins and managers can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins and managers can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins and managers can delete accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view accounts in current organization" ON public.accounts;

CREATE POLICY "Users can view accounts in current organization"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_staff_in_org((SELECT auth.uid()), organization_id)
      OR client_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert accounts"
  ON public.accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update accounts"
  ON public.accounts
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can delete accounts"
  ON public.accounts
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Staff and managers can view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins and managers can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins and managers can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins and managers can delete equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can view equipment in current organization" ON public.equipment;

CREATE POLICY "Users can view equipment in current organization"
  ON public.equipment
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_staff_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Admins and managers can insert equipment"
  ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update equipment"
  ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can delete equipment"
  ON public.equipment
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view work logs" ON public.work_logs;
DROP POLICY IF EXISTS "Users can insert work logs" ON public.work_logs;
DROP POLICY IF EXISTS "Users can update work logs" ON public.work_logs;
DROP POLICY IF EXISTS "Admins and managers can delete work logs" ON public.work_logs;

CREATE POLICY "Users can view work logs"
  ON public.work_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
      OR (
        public.has_role_in_org((SELECT auth.uid()), organization_id, 'client')
        AND EXISTS (
          SELECT 1
          FROM public.accounts a
          WHERE a.id = account_id
            AND a.client_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert work logs"
  ON public.work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can update work logs"
  ON public.work_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Admins and managers can delete work logs"
  ON public.work_logs
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view shovel work logs" ON public.shovel_work_logs;
DROP POLICY IF EXISTS "Users can insert shovel work logs" ON public.shovel_work_logs;
DROP POLICY IF EXISTS "Users can update shovel work logs" ON public.shovel_work_logs;
DROP POLICY IF EXISTS "Admins and managers can delete shovel work logs" ON public.shovel_work_logs;

CREATE POLICY "Users can view shovel work logs"
  ON public.shovel_work_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
      OR (
        public.has_role_in_org((SELECT auth.uid()), organization_id, 'client')
        AND EXISTS (
          SELECT 1
          FROM public.accounts a
          WHERE a.id = account_id
            AND a.client_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert shovel work logs"
  ON public.shovel_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can update shovel work logs"
  ON public.shovel_work_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Admins and managers can delete shovel work logs"
  ON public.shovel_work_logs
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Users can insert time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Users can update time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Admins and managers can delete time clock entries" ON public.time_clock;

CREATE POLICY "Users can view time clock entries"
  ON public.time_clock
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can insert time clock entries"
  ON public.time_clock
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can update time clock entries"
  ON public.time_clock
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Admins and managers can delete time clock entries"
  ON public.time_clock
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Truckers can insert their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Users can view their own maintenance requests"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Truckers can insert their own maintenance requests"
  ON public.maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can update their own maintenance requests"
  ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR public.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Admins can delete maintenance requests"
  ON public.maintenance_requests
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins and managers can view settings" ON public.overtime_notification_settings;
DROP POLICY IF EXISTS "Admins and managers can insert overtime settings" ON public.overtime_notification_settings;
DROP POLICY IF EXISTS "Admins and managers can update overtime settings" ON public.overtime_notification_settings;
DROP POLICY IF EXISTS "Admins and managers can delete overtime settings" ON public.overtime_notification_settings;
DROP POLICY IF EXISTS "Admins and managers can view overtime settings" ON public.overtime_notification_settings;

CREATE POLICY "Admins and managers can view overtime settings"
  ON public.overtime_notification_settings
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can insert overtime settings"
  ON public.overtime_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update overtime settings"
  ON public.overtime_notification_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can delete overtime settings"
  ON public.overtime_notification_settings
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins and managers can view sent notifications" ON public.overtime_notifications_sent;
DROP POLICY IF EXISTS "System can insert sent notifications" ON public.overtime_notifications_sent;

CREATE POLICY "Admins and managers can view sent notifications"
  ON public.overtime_notifications_sent
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "System can insert sent notifications"
  ON public.overtime_notifications_sent
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    OR public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can insert their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can update their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can delete their own device tokens" ON public.push_device_tokens;

CREATE POLICY "Users can view their own device tokens"
  ON public.push_device_tokens
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  );

CREATE POLICY "Users can insert their own device tokens"
  ON public.push_device_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
  );

CREATE POLICY "Users can update their own device tokens"
  ON public.push_device_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
  );

CREATE POLICY "Users can delete their own device tokens"
  ON public.push_device_tokens
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  );

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
  );

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
  );

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Users can update their own notifications (mark read)" ON public.notifications_log;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  );

CREATE POLICY "Admins can insert notifications"
  ON public.notifications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (
      auth.uid() = user_id
      OR public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Users can update their own notifications (mark read)"
  ON public.notifications_log
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
  );

DROP POLICY IF EXISTS "Admins and managers can view settings" ON public.maintenance_notification_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.maintenance_notification_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.maintenance_notification_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.maintenance_notification_settings;

CREATE POLICY "Admins and managers can view settings"
  ON public.maintenance_notification_settings
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can manage settings"
  ON public.maintenance_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can update settings"
  ON public.maintenance_notification_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can delete settings"
  ON public.maintenance_notification_settings
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins and managers can view settings" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can manage settings" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can view notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can manage notification types" ON public.notification_types;

CREATE POLICY "Admins and managers can view notification types"
  ON public.notification_types
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can manage notification types"
  ON public.notification_types
  FOR ALL
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins and managers can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins and managers can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );
