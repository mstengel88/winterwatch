-- Drop existing policies that allow managers to manage ALL roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create a function to check if user is an admin (not manager)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
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
      AND role = 'admin'
  )
$$;

-- Policy: Admins can insert any role, managers can insert non-admin roles only
CREATE POLICY "Role insert restrictions"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can assign any role
    public.is_admin(auth.uid())
    OR
    -- Managers can assign roles, but NOT admin
    (public.is_admin_or_manager(auth.uid()) AND role != 'admin')
  );

-- Policy: Admins can update any role, managers cannot update admin roles
CREATE POLICY "Role update restrictions"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR
    (public.is_admin_or_manager(auth.uid()) AND role != 'admin')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR
    (public.is_admin_or_manager(auth.uid()) AND role != 'admin')
  );

-- Policy: Admins can delete any role, managers cannot delete admin roles
CREATE POLICY "Role delete restrictions"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR
    (public.is_admin_or_manager(auth.uid()) AND role != 'admin')
  );