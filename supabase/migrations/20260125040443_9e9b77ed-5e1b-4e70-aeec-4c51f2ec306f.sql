-- Optimize RLS policies to prevent re-evaluation of auth.uid() for each row
-- Using (select auth.uid()) evaluates once per query instead of per row

-- =====================
-- PROFILES
-- =====================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- =====================
-- EMPLOYEES
-- =====================
DROP POLICY IF EXISTS "Staff and managers can view employees" ON public.employees;
CREATE POLICY "Staff and managers can view employees" ON public.employees
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can insert employees" ON public.employees;
CREATE POLICY "Admins and managers can insert employees" ON public.employees
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can update employees" ON public.employees;
CREATE POLICY "Admins and managers can update employees" ON public.employees
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())))
  WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can delete employees" ON public.employees;
CREATE POLICY "Admins and managers can delete employees" ON public.employees
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- ACCOUNTS
-- =====================
DROP POLICY IF EXISTS "Staff and managers can view accounts" ON public.accounts;
CREATE POLICY "Staff and managers can view accounts" ON public.accounts
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_staff((select auth.uid())) OR (client_id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can insert accounts" ON public.accounts;
CREATE POLICY "Admins and managers can insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can update accounts" ON public.accounts;
CREATE POLICY "Admins and managers can update accounts" ON public.accounts
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())))
  WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can delete accounts" ON public.accounts;
CREATE POLICY "Admins and managers can delete accounts" ON public.accounts
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- EQUIPMENT
-- =====================
DROP POLICY IF EXISTS "Staff and managers can view equipment" ON public.equipment;
CREATE POLICY "Staff and managers can view equipment" ON public.equipment
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can insert equipment" ON public.equipment;
CREATE POLICY "Admins and managers can insert equipment" ON public.equipment
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can update equipment" ON public.equipment;
CREATE POLICY "Admins and managers can update equipment" ON public.equipment
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())))
  WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can delete equipment" ON public.equipment;
CREATE POLICY "Admins and managers can delete equipment" ON public.equipment
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- WORK_LOGS
-- =====================
DROP POLICY IF EXISTS "Users can view work logs" ON public.work_logs;
CREATE POLICY "Users can view work logs" ON public.work_logs
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can insert work logs" ON public.work_logs;
CREATE POLICY "Users can insert work logs" ON public.work_logs
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can update work logs" ON public.work_logs;
CREATE POLICY "Users can update work logs" ON public.work_logs
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id))
  WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Admins and managers can delete work logs" ON public.work_logs;
CREATE POLICY "Admins and managers can delete work logs" ON public.work_logs
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- SHOVEL_WORK_LOGS
-- =====================
DROP POLICY IF EXISTS "Users can view shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Users can view shovel work logs" ON public.shovel_work_logs
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can insert shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Users can insert shovel work logs" ON public.shovel_work_logs
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can update shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Users can update shovel work logs" ON public.shovel_work_logs
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id))
  WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Admins and managers can delete shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Admins and managers can delete shovel work logs" ON public.shovel_work_logs
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- TIME_CLOCK
-- =====================
DROP POLICY IF EXISTS "Users can view time clock entries" ON public.time_clock;
CREATE POLICY "Users can view time clock entries" ON public.time_clock
  FOR SELECT USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can insert time clock entries" ON public.time_clock;
CREATE POLICY "Users can insert time clock entries" ON public.time_clock
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Users can update time clock entries" ON public.time_clock;
CREATE POLICY "Users can update time clock entries" ON public.time_clock
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id))
  WITH CHECK (is_admin_or_manager((select auth.uid())) OR is_user_employee((select auth.uid()), employee_id));

DROP POLICY IF EXISTS "Admins and managers can delete time clock entries" ON public.time_clock;
CREATE POLICY "Admins and managers can delete time clock entries" ON public.time_clock
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- USER_ROLES
-- =====================
DROP POLICY IF EXISTS "Role insert restrictions" ON public.user_roles;
CREATE POLICY "Role insert restrictions" ON public.user_roles
  FOR INSERT WITH CHECK (is_admin((select auth.uid())) OR (is_admin_or_manager((select auth.uid())) AND (role <> 'admin'::app_role)));

DROP POLICY IF EXISTS "Role update restrictions" ON public.user_roles;
CREATE POLICY "Role update restrictions" ON public.user_roles
  FOR UPDATE USING (is_admin((select auth.uid())) OR (is_admin_or_manager((select auth.uid())) AND (role <> 'admin'::app_role)))
  WITH CHECK (is_admin((select auth.uid())) OR (is_admin_or_manager((select auth.uid())) AND (role <> 'admin'::app_role)));

DROP POLICY IF EXISTS "Role delete restrictions" ON public.user_roles;
CREATE POLICY "Role delete restrictions" ON public.user_roles
  FOR DELETE USING (is_admin((select auth.uid())) OR (is_admin_or_manager((select auth.uid())) AND (role <> 'admin'::app_role)));

-- =====================
-- NOTIFICATIONS_LOG
-- =====================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications_log;
CREATE POLICY "Users can view their own notifications" ON public.notifications_log
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications_log;
CREATE POLICY "Admins can view all notifications" ON public.notifications_log
  FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications_log;
CREATE POLICY "Admins can insert notifications" ON public.notifications_log
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())) OR ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update their own notifications (mark read)" ON public.notifications_log;
CREATE POLICY "Users can update their own notifications (mark read)" ON public.notifications_log
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- =====================
-- OVERTIME_NOTIFICATIONS_SENT
-- =====================
DROP POLICY IF EXISTS "Admins and managers can view sent notifications" ON public.overtime_notifications_sent;
CREATE POLICY "Admins and managers can view sent notifications" ON public.overtime_notifications_sent
  FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can insert sent notifications" ON public.overtime_notifications_sent;
CREATE POLICY "Admins and managers can insert sent notifications" ON public.overtime_notifications_sent
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

-- =====================
-- OVERTIME_NOTIFICATION_SETTINGS
-- =====================
DROP POLICY IF EXISTS "Admins and managers can view overtime settings" ON public.overtime_notification_settings;
CREATE POLICY "Admins and managers can view overtime settings" ON public.overtime_notification_settings
  FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can insert overtime settings" ON public.overtime_notification_settings;
CREATE POLICY "Admins and managers can insert overtime settings" ON public.overtime_notification_settings
  FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can update overtime settings" ON public.overtime_notification_settings;
CREATE POLICY "Admins and managers can update overtime settings" ON public.overtime_notification_settings
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())))
  WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Admins and managers can delete overtime settings" ON public.overtime_notification_settings;
CREATE POLICY "Admins and managers can delete overtime settings" ON public.overtime_notification_settings
  FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- =====================
-- PUSH_DEVICE_TOKENS
-- =====================
DROP POLICY IF EXISTS "Users can view their own device tokens" ON public.push_device_tokens;
CREATE POLICY "Users can view their own device tokens" ON public.push_device_tokens
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own device tokens" ON public.push_device_tokens;
CREATE POLICY "Users can insert their own device tokens" ON public.push_device_tokens
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own device tokens" ON public.push_device_tokens;
CREATE POLICY "Users can update their own device tokens" ON public.push_device_tokens
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own device tokens" ON public.push_device_tokens;
CREATE POLICY "Users can delete their own device tokens" ON public.push_device_tokens
  FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================
-- NOTIFICATION_PREFERENCES
-- =====================
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update all notification preferences" ON public.notification_preferences;
CREATE POLICY "Admins can update all notification preferences" ON public.notification_preferences
  FOR UPDATE USING (is_admin_or_manager((select auth.uid())));