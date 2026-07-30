-- Move internal SECURITY DEFINER helpers out of the exposed public schema.
-- This keeps RLS and trigger helpers available to the database while removing
-- them as callable PostgREST RPC endpoints.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

ALTER FUNCTION public.assign_organization_id() SET SCHEMA private;
ALTER FUNCTION public.audit_trigger_func() SET SCHEMA private;
ALTER FUNCTION public.can_access_organization(uuid) SET SCHEMA private;
ALTER FUNCTION public.cleanup_old_employee_locations() SET SCHEMA private;
ALTER FUNCTION public.current_organization_id() SET SCHEMA private;
ALTER FUNCTION public.current_organization_id_for_user(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_employee_id(uuid) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.has_role_in_org(uuid, uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_admin_or_manager(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_admin_or_manager_in_org(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_staff(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_staff_in_org(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_user_employee(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.organization_id_for_account(uuid) SET SCHEMA private;
ALTER FUNCTION public.organization_id_for_employee(uuid) SET SCHEMA private;
ALTER FUNCTION public.organization_id_for_equipment(uuid) SET SCHEMA private;
ALTER FUNCTION public.organization_id_for_time_clock(uuid) SET SCHEMA private;
ALTER FUNCTION public.prevent_system_notification_type_field_edits() SET SCHEMA private;
ALTER FUNCTION public.sync_profile_active_organization_from_role() SET SCHEMA private;
ALTER FUNCTION public.user_belongs_to_organization(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.user_shares_current_organization(uuid) SET SCHEMA private;

REVOKE EXECUTE ON FUNCTION private.assign_organization_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.audit_trigger_func() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.can_access_organization(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.cleanup_old_employee_locations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.current_organization_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.current_organization_id_for_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.get_employee_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.has_role_in_org(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_admin_or_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_admin_or_manager_in_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_staff_in_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_user_employee(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.organization_id_for_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.organization_id_for_employee(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.organization_id_for_equipment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.organization_id_for_time_clock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.prevent_system_notification_type_field_edits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.sync_profile_active_organization_from_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.user_belongs_to_organization(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.user_shares_current_organization(uuid) FROM PUBLIC, anon;
