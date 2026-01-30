import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OvertimeSettings {
  id: string;
  employee_id: string | null;
  threshold_hours: number;
  is_enabled: boolean;
  notify_employee: boolean;
  notify_admins: boolean;
}

interface ActiveClockEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string | null;
}

interface DeviceToken {
  user_id: string;
  player_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!onesignalAppId || !onesignalApiKey) {
      throw new Error('Missing OneSignal environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for overtime notifications...');

    // Get all enabled overtime settings
    const { data: overtimeSettings, error: settingsError } = await supabase
      .from('overtime_notification_settings')
      .select('*')
      .eq('is_enabled', true);

    if (settingsError) {
      console.error('Error fetching overtime settings:', settingsError);
      throw settingsError;
    }

    if (!overtimeSettings || overtimeSettings.length === 0) {
      console.log('No overtime settings configured');
      return new Response(JSON.stringify({ success: true, checked: 0, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all active clock entries (clocked in but not out)
    const { data: activeClockEntries, error: clockError } = await supabase
      .from('time_clock')
      .select('id, employee_id, clock_in_time')
      .is('clock_out_time', null);

    if (clockError) {
      console.error('Error fetching clock entries:', clockError);
      throw clockError;
    }

    if (!activeClockEntries || activeClockEntries.length === 0) {
      console.log('No active clock entries');
      return new Response(JSON.stringify({ success: true, checked: 0, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${activeClockEntries.length} active clock entries`);

    // Separate global settings from individual settings (now supports multiple global)
    const globalSettings = (overtimeSettings as OvertimeSettings[]).filter(s => s.employee_id === null);
    const individualSettings = (overtimeSettings as OvertimeSettings[]).filter(s => s.employee_id !== null);

    console.log(`Found ${globalSettings.length} global settings and ${individualSettings.length} individual settings`);

    // Build a map of employee_id -> array of settings (for individual overrides)
    const individualSettingsMap = new Map<string, OvertimeSettings[]>();
    for (const setting of individualSettings) {
      if (setting.employee_id) {
        const existing = individualSettingsMap.get(setting.employee_id) || [];
        existing.push(setting);
        individualSettingsMap.set(setting.employee_id, existing);
      }
    }

    // Get employee details
    const employeeIds = [...new Set(activeClockEntries.map((e: ActiveClockEntry) => e.employee_id))];
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, user_id')
      .in('id', employeeIds);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    const employeeMap = new Map<string, Employee>();
    for (const emp of employees as Employee[]) {
      employeeMap.set(emp.id, emp);
    }

    // Get already sent notifications to avoid duplicates
    const clockEntryIds = activeClockEntries.map((e: ActiveClockEntry) => e.id);
    const { data: sentNotifications, error: sentError } = await supabase
      .from('overtime_notifications_sent')
      .select('time_clock_id, threshold_hours')
      .in('time_clock_id', clockEntryIds);

    if (sentError) {
      console.error('Error fetching sent notifications:', sentError);
      throw sentError;
    }

    const sentSet = new Set<string>();
    for (const sent of sentNotifications || []) {
      sentSet.add(`${sent.time_clock_id}_${sent.threshold_hours}`);
    }

    // Get admin/manager user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    const adminUserIds = (adminRoles || []).map((r: { user_id: string }) => r.user_id);

    // Process each active clock entry
    const now = new Date();
    let notifiedCount = 0;

    for (const entry of activeClockEntries as ActiveClockEntry[]) {
      const clockInTime = new Date(entry.clock_in_time);
      const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Get applicable settings: individual settings for this employee, or global settings
      const employeeIndividualSettings = individualSettingsMap.get(entry.employee_id);
      const applicableSettings = employeeIndividualSettings && employeeIndividualSettings.length > 0
        ? employeeIndividualSettings
        : globalSettings;

      if (applicableSettings.length === 0) continue;

      const employee = employeeMap.get(entry.employee_id);
      if (!employee) continue;

      const employeeName = `${employee.first_name} ${employee.last_name}`;
      const hoursFormatted = Math.floor(hoursWorked);
      const settingType = employeeIndividualSettings && employeeIndividualSettings.length > 0 ? 'individual' : 'global';

      // Check each applicable setting
      for (const setting of applicableSettings) {
        // Skip if threshold not exceeded
        if (hoursWorked < setting.threshold_hours) {
          continue;
        }

        // Check if already notified for this clock entry and threshold
        const notificationKey = `${entry.id}_${setting.threshold_hours}`;
        if (sentSet.has(notificationKey)) {
          console.log(`Already notified for clock entry ${entry.id} at ${setting.threshold_hours}hrs`);
          continue;
        }

        console.log(`Employee ${employeeName} has been clocked in for ${hoursFormatted} hours (threshold: ${setting.threshold_hours}, setting: ${settingType})`);

        // Collect user IDs to notify - separate employee from admins
        const employeeUserId = setting.notify_employee && employee.user_id ? employee.user_id : null;
        const adminUserIdsToNotify: string[] = [];

        if (setting.notify_admins) {
          for (const adminId of adminUserIds) {
            // Don't add employee to admin list (they get their own notification)
            if (adminId !== employeeUserId) {
              adminUserIdsToNotify.push(adminId);
            }
          }
        }

        const hasEmployeeToNotify = !!employeeUserId;
        const hasAdminsToNotify = adminUserIdsToNotify.length > 0;

        if (!hasEmployeeToNotify && !hasAdminsToNotify) {
          console.log('No users to notify');
          continue;
        }

        // Notification content - different for employee vs admins
        const title = 'Overtime Alert';
        const employeeBody = `You have been clocked in for ${hoursFormatted} hours. Would you like to stay on shift or clock out?`;
        const adminBody = `${employeeName} has been clocked in for ${hoursFormatted} hours`;

        const baseNotificationData = {
          type: 'overtime_alert',
          employee_id: entry.employee_id,
          time_clock_id: entry.id,
          hours_worked: hoursFormatted,
        };

        // Send notification to EMPLOYEE (with action buttons)
        if (hasEmployeeToNotify) {
          try {
            const { data: employeeTokens, error: empTokensError } = await supabase
              .from('push_device_tokens')
              .select('player_id')
              .eq('user_id', employeeUserId)
              .eq('is_active', true);

            if (empTokensError) {
              console.error('Error fetching employee tokens:', empTokensError);
            } else if (employeeTokens && employeeTokens.length > 0) {
              const employeePlayerIds = employeeTokens.map((t) => t.player_id);

              const employeePayload = {
                app_id: onesignalAppId,
                include_player_ids: employeePlayerIds,
                headings: { en: title },
                contents: { en: employeeBody },
                ios_sound: 'default',
                data: baseNotificationData,
                ios_category: 'overtime_action',
                buttons: [
                  { id: 'stay_on_shift', text: 'Stay on Shift' },
                  { id: 'stop_shift', text: 'Stop Shift' },
                ],
              };

              const empResponse = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${onesignalApiKey}`,
                },
                body: JSON.stringify(employeePayload),
              });

              if (empResponse.ok) {
                const empData = await empResponse.json();
                console.log('Employee notification sent:', empData.id);

                await supabase.from('notifications_log').insert({
                  user_id: employeeUserId,
                  notification_type: 'shift_status',
                  title,
                  body: employeeBody,
                  onesignal_id: empData.id,
                  data: baseNotificationData,
                });
              } else {
                console.error('Employee notification failed:', await empResponse.text());
              }
            }
          } catch (empError) {
            console.error('Error sending employee notification:', empError);
          }
        }

        // Send notification to ADMINS (with employee name, no action buttons)
        if (hasAdminsToNotify) {
          try {
            const { data: adminTokens, error: adminTokensError } = await supabase
              .from('push_device_tokens')
              .select('user_id, player_id')
              .in('user_id', adminUserIdsToNotify)
              .eq('is_active', true);

            if (adminTokensError) {
              console.error('Error fetching admin tokens:', adminTokensError);
            } else if (adminTokens && adminTokens.length > 0) {
              const adminPlayerIds = adminTokens.map((t) => t.player_id);

              const adminPayload = {
                app_id: onesignalAppId,
                include_player_ids: adminPlayerIds,
                headings: { en: title },
                contents: { en: adminBody },
                ios_sound: 'default',
                data: baseNotificationData,
              };

              const adminResponse = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${onesignalApiKey}`,
                },
                body: JSON.stringify(adminPayload),
              });

              if (adminResponse.ok) {
                const adminData = await adminResponse.json();
                console.log('Admin notification sent:', adminData.id);

                // Log for each admin
                for (const adminUserId of adminUserIdsToNotify) {
                  await supabase.from('notifications_log').insert({
                    user_id: adminUserId,
                    notification_type: 'shift_status',
                    title,
                    body: adminBody,
                    onesignal_id: adminData.id,
                    data: baseNotificationData,
                  });
                }
              } else {
                console.error('Admin notification failed:', await adminResponse.text());
              }
            }
          } catch (adminError) {
            console.error('Error sending admin notification:', adminError);
          }
        }

        // Record that we sent this notification
        const { error: insertError } = await supabase
          .from('overtime_notifications_sent')
          .insert({
            time_clock_id: entry.id,
            employee_id: entry.employee_id,
            threshold_hours: setting.threshold_hours,
          });

        if (insertError) {
          console.error('Error recording sent notification:', insertError);
        }

        notifiedCount++;
      } // End of settings loop
    } // End of entries loop

    console.log(`Checked ${activeClockEntries.length} entries, notified ${notifiedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: activeClockEntries.length, 
        notified: notifiedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in check-overtime:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
