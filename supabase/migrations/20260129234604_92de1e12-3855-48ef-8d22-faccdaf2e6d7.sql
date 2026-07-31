-- Fix audit trigger function: resolve ambiguous "key" reference when diffing jsonb
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _user_email text;
  _old_data jsonb;
  _new_data jsonb;
  _changed_fields text[];
BEGIN
  -- Get current user info
  _user_id := auth.uid();

  -- Get user email from profiles
  SELECT email INTO _user_email
  FROM public.profiles
  WHERE id = _user_id;

  IF TG_OP = 'DELETE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
    _changed_fields := NULL;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, _old_data, _new_data, _changed_fields, _user_id, _user_email);

    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);

    -- Find changed fields (exclude updated_at); avoid ambiguous "key" by coalescing join keys
    _changed_fields := ARRAY(
      SELECT COALESCE(o.key, n.key)
      FROM jsonb_each(_old_data) AS o(key, value)
      FULL OUTER JOIN jsonb_each(_new_data) AS n(key, value)
        ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value
        AND COALESCE(o.key, n.key) <> 'updated_at'
    );

    -- Only log if there are actual changes (excluding updated_at)
    IF array_length(_changed_fields, 1) > 0 THEN
      INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id, user_email)
      VALUES (TG_TABLE_NAME, NEW.id, TG_OP, _old_data, _new_data, _changed_fields, _user_id, _user_email);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
    _changed_fields := NULL;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, _old_data, _new_data, _changed_fields, _user_id, _user_email);

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;
