-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid,
  user_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view audit logs
CREATE POLICY "Admins and managers can view audit logs"
ON public.audit_logs
FOR SELECT
USING (is_admin_or_manager((SELECT auth.uid())));

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _old_data jsonb;
  _new_data jsonb;
  _changed_fields text[];
  _key text;
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
    
    -- Find changed fields
    _changed_fields := ARRAY(
      SELECT key
      FROM jsonb_each(_old_data) AS o(key, value)
      FULL OUTER JOIN jsonb_each(_new_data) AS n(key, value) ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value
        AND o.key NOT IN ('updated_at')
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
$$;

-- Create triggers on work_logs
CREATE TRIGGER audit_work_logs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.work_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Create triggers on shovel_work_logs
CREATE TRIGGER audit_shovel_work_logs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.shovel_work_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Create triggers on time_clock
CREATE TRIGGER audit_time_clock_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.time_clock
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();