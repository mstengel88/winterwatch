CREATE TABLE IF NOT EXISTS private.protected_admin_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.protected_admin_accounts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_protected_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.protected_admin_accounts
    WHERE user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_protected_admin_user(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.prevent_protected_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin'::public.app_role AND private.is_protected_admin_user(OLD.user_id) THEN
    RAISE EXCEPTION 'Protected admin roles cannot be changed or removed.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION private.prevent_protected_admin_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_owner_admin_roles_on_update ON public.user_roles;
CREATE TRIGGER protect_owner_admin_roles_on_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_protected_admin_role_change();

DROP TRIGGER IF EXISTS protect_owner_admin_roles_on_delete ON public.user_roles;
CREATE TRIGGER protect_owner_admin_roles_on_delete
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_protected_admin_role_change();

CREATE OR REPLACE FUNCTION private.assign_protected_admins_to_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (organization_id, user_id, role)
  SELECT NEW.id, paa.user_id, 'admin'::public.app_role
  FROM private.protected_admin_accounts paa
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.assign_protected_admins_to_organization() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assign_protected_admins_to_organization ON public.organizations;
CREATE TRIGGER assign_protected_admins_to_organization
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION private.assign_protected_admins_to_organization();

INSERT INTO private.protected_admin_accounts (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE lower(email) = lower('matthewstengel69@gmail.com')
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;

INSERT INTO public.user_roles (organization_id, user_id, role)
SELECT organizations.id, paa.user_id, 'admin'::public.app_role
FROM public.organizations
CROSS JOIN private.protected_admin_accounts paa
WHERE lower(paa.email) = lower('matthewstengel69@gmail.com')
ON CONFLICT (organization_id, user_id, role) DO NOTHING;
