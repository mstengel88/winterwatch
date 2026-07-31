-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION public.prevent_system_notification_type_field_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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