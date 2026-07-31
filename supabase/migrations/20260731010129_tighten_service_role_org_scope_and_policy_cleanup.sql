-- Tighten multi-tenant policy boundaries and remove legacy duplicate policies.

DROP INDEX IF EXISTS public.idx_organizations_slug;

DROP POLICY IF EXISTS "Users can view organizations in their org scope" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations in their org scope" ON public.organizations;

CREATE POLICY "Users can view organizations in their org scope"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (private.can_access_organization(id));

CREATE POLICY "Admins can update organizations in their org scope"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (private.is_admin_or_manager_in_org((SELECT auth.uid()), id))
  WITH CHECK (private.is_admin_or_manager_in_org((SELECT auth.uid()), id));

CREATE POLICY "Admins can delete organizations in their org scope"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (private.is_admin_or_manager_in_org((SELECT auth.uid()), id));

DROP POLICY IF EXISTS "Users can view profiles in their active organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their active organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR private.user_shares_current_organization(id)
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (
      active_organization_id IS NULL
      OR private.user_belongs_to_organization((SELECT auth.uid()), active_organization_id)
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (
      active_organization_id IS NULL
      OR private.user_belongs_to_organization((SELECT auth.uid()), active_organization_id)
    )
  );

DROP POLICY IF EXISTS "Admins and managers can view all locations" ON public.employee_locations;
DROP POLICY IF EXISTS "Users can view their own locations" ON public.employee_locations;
DROP POLICY IF EXISTS "Users can insert their own location pings" ON public.employee_locations;
DROP POLICY IF EXISTS "Admins can delete location data" ON public.employee_locations;

CREATE POLICY "Users can view location pings in current organization"
  ON public.employee_locations
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND (
      private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR private.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Users can insert location pings in current organization"
  ON public.employee_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND (
      private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR private.is_user_employee((SELECT auth.uid()), employee_id)
    )
  );

CREATE POLICY "Admins can delete location data in current organization"
  ON public.employee_locations
  FOR DELETE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins and managers can view maintenance logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Admins and managers can insert maintenance logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Admins and managers can update maintenance logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Admins and managers can delete maintenance logs" ON public.maintenance_logs;

CREATE POLICY "Users can view maintenance logs in current organization"
  ON public.maintenance_logs
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND (
      private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
      OR private.is_staff_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Admins and managers can insert maintenance logs in current organization"
  ON public.maintenance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update maintenance logs in current organization"
  ON public.maintenance_logs
  FOR UPDATE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can delete maintenance logs in current organization"
  ON public.maintenance_logs
  FOR DELETE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Users can view their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can insert their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can update their own device tokens" ON public.push_device_tokens;
DROP POLICY IF EXISTS "Users can delete their own device tokens" ON public.push_device_tokens;

CREATE POLICY "Users can view their own device tokens"
  ON public.push_device_tokens
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_access_organization(organization_id)
  );

CREATE POLICY "Users can insert their own device tokens"
  ON public.push_device_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id = private.current_organization_id()
  );

CREATE POLICY "Users can update their own device tokens"
  ON public.push_device_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_access_organization(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id = private.current_organization_id()
  );

CREATE POLICY "Users can delete their own device tokens"
  ON public.push_device_tokens
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_access_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admins can update all notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_access_organization(organization_id)
  );

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id = private.current_organization_id()
  );

CREATE POLICY "Users or admins can update notification preferences in current organization"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  )
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  );

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Users can update their own notifications (mark read)" ON public.notifications_log;

CREATE POLICY "Users can view notifications in current organization"
  ON public.notifications_log
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Users can insert notifications in current organization"
  ON public.notifications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Users can update their own notifications (mark read)"
  ON public.notifications_log
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_access_organization(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id = private.current_organization_id()
  );

DROP POLICY IF EXISTS "Anyone authenticated can view active notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can view notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can manage notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can insert notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can update notification types" ON public.notification_types;
DROP POLICY IF EXISTS "Admins and managers can delete notification types" ON public.notification_types;

CREATE POLICY "Users can view notification types in current organization"
  ON public.notification_types
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND (
      is_active = true
      OR private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    )
  );

CREATE POLICY "Admins and managers can insert notification types in current organization"
  ON public.notification_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins and managers can update notification types in current organization"
  ON public.notification_types
  FOR UPDATE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    AND is_system = false
  )
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    AND is_system = false
  );

CREATE POLICY "Admins and managers can delete notification types in current organization"
  ON public.notification_types
  FOR DELETE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
    AND is_system = false
  );

DROP POLICY IF EXISTS "Admins and managers can view sent notifications" ON public.overtime_notifications_sent;
DROP POLICY IF EXISTS "Admins and managers can insert sent notifications" ON public.overtime_notifications_sent;
DROP POLICY IF EXISTS "System can insert sent notifications" ON public.overtime_notifications_sent;

CREATE POLICY "Admins and managers can view sent notifications"
  ON public.overtime_notifications_sent
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can insert sent notifications in current organization"
  ON public.overtime_notifications_sent
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "Admins can view scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Admins can insert scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Admins can update scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Admins can delete scheduled notifications" ON public.scheduled_notifications;

CREATE POLICY "Admins can view scheduled notifications in current organization"
  ON public.scheduled_notifications
  FOR SELECT
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can insert scheduled notifications in current organization"
  ON public.scheduled_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can update scheduled notifications in current organization"
  ON public.scheduled_notifications
  FOR UPDATE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );

CREATE POLICY "Admins can delete scheduled notifications in current organization"
  ON public.scheduled_notifications
  FOR DELETE
  TO authenticated
  USING (
    private.can_access_organization(organization_id)
    AND private.is_admin_or_manager_in_org((SELECT auth.uid()), organization_id)
  );
