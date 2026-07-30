-- Restrict SECURITY DEFINER functions so anonymous users cannot call them via PostgREST RPC.
-- Helper functions used by RLS stay available to authenticated users only.

REVOKE EXECUTE ON FUNCTION public.assign_organization_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_organization(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_employee_locations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_organization_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_organization_id_for_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_employee_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager_in_org(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff_in_org(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_employee(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.organization_id_for_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.organization_id_for_employee(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.organization_id_for_equipment(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.organization_id_for_time_clock(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_system_notification_type_field_edits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_active_organization_from_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_organization(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_shares_current_organization(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organization_id_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager_in_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_in_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_employee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_shares_current_organization(uuid) TO authenticated;
