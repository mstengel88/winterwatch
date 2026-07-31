-- Fix internal helper cross-references after moving SECURITY DEFINER functions
-- from public to private. These functions still need to call one another, but
-- must no longer reference the old public schema names.

CREATE OR REPLACE FUNCTION private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN NULL
    ELSE private.current_organization_id_for_user((SELECT auth.uid()))
  END
$$;

CREATE OR REPLACE FUNCTION private.can_access_organization(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN false
    ELSE private.user_belongs_to_organization((SELECT auth.uid()), _organization_id)
  END
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role_in_org(_user_id, private.current_organization_id_for_user(_user_id), _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_admin_or_manager_in_org(_user_id, private.current_organization_id_for_user(_user_id))
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_staff_in_org(_user_id, private.current_organization_id_for_user(_user_id))
$$;

CREATE OR REPLACE FUNCTION private.get_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE user_id = _user_id
    AND organization_id = private.current_organization_id_for_user(_user_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_user_employee(_user_id uuid, _employee_id uuid)
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
      AND organization_id = private.current_organization_id_for_user(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION private.user_shares_current_organization(_target_user_id uuid)
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
      AND viewer.organization_id = private.current_organization_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.assign_organization_id()
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
      private.current_organization_id_for_user(NEW.user_id),
      private.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'accounts' THEN
    NEW.organization_id := COALESCE(
      private.current_organization_id_for_user(NEW.client_id),
      private.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'employees' THEN
    NEW.organization_id := COALESCE(
      private.current_organization_id_for_user(NEW.user_id),
      private.current_organization_id(),
      v_default_org
    );
    RETURN NEW;
  END IF;

  NEW.organization_id := COALESCE(
    CASE
      WHEN v_account_id IS NOT NULL THEN private.organization_id_for_account(v_account_id)
      ELSE NULL
    END,
    CASE
      WHEN v_employee_id IS NOT NULL THEN private.organization_id_for_employee(v_employee_id)
      ELSE NULL
    END,
    CASE
      WHEN v_equipment_id IS NOT NULL THEN private.organization_id_for_equipment(v_equipment_id)
      ELSE NULL
    END,
    CASE
      WHEN v_time_clock_id IS NOT NULL THEN private.organization_id_for_time_clock(v_time_clock_id)
      ELSE NULL
    END,
    CASE
      WHEN v_performed_by_employee_id IS NOT NULL THEN private.organization_id_for_employee(v_performed_by_employee_id)
      ELSE NULL
    END,
    CASE
      WHEN v_user_id IS NOT NULL THEN private.current_organization_id_for_user(v_user_id)
      ELSE NULL
    END,
    CASE
      WHEN v_created_by IS NOT NULL THEN private.current_organization_id_for_user(v_created_by)
      ELSE NULL
    END,
    private.current_organization_id(),
    v_default_org
  );

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.audit_trigger_func()
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
      private.current_organization_id_for_user(user_id_val),
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
      private.current_organization_id_for_user(user_id_val),
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
      private.current_organization_id_for_user(user_id_val),
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
END
$$;
