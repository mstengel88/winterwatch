-- Restore UUID-safe audit trigger writes after moving the trigger function to
-- the private schema.

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
  record_id_val uuid;
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
    record_id_val := NEW.id;
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
    record_id_val := NEW.id;
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
    record_id_val := OLD.id;
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
