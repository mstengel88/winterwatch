-- Allow admins/managers to update system notification types (needed for mandatory settings)

-- 1) Replace overly-restrictive UPDATE policy
DROP POLICY IF EXISTS "Admins and managers can update notification types" ON public.notification_types;

CREATE POLICY "Admins and managers can update notification types"
ON public.notification_types
FOR UPDATE
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- 2) Prevent edits to protected fields on system types via trigger
CREATE OR REPLACE FUNCTION public.prevent_system_notification_type_field_edits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_system THEN
    IF NEW.name IS DISTINCT FROM OLD.name
      OR NEW.label IS DISTINCT FROM OLD.label
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.is_system IS DISTINCT FROM OLD.is_system
    THEN
      RAISE EXCEPTION 'System notification types cannot have name/label/description modified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_system_notification_type_field_edits ON public.notification_types;

CREATE TRIGGER trg_prevent_system_notification_type_field_edits
BEFORE UPDATE ON public.notification_types
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_notification_type_field_edits();
