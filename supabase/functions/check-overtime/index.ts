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

    // Separate global setting from individual settings
    const globalSetting = (overtimeSettings as OvertimeSettings[]).find(s => s.employee_id === null);
    const individualSettings = (overtimeSettings as OvertimeSettings[]).filter(s => s.employee_id !== null);

    // Build a map of employee_id -> settings (individual overrides global)
    const settingsMap = new Map<string, OvertimeSettings>();
    for (const setting of individualSettings) {
      if (setting.employee_id) {
        settingsMap.set(setting.employee_id, setting);
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
      // Get individual setting if exists, otherwise use global setting
      let setting = settingsMap.get(entry.employee_id);
      const isUsingGlobal = !setting && globalSetting;
      if (!setting) {
        setting = globalSetting;
      }
      if (!setting) continue;

      const clockInTime = new Date(entry.clock_in_time);
      const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Check if threshold is exceeded
      if (hoursWorked < setting.threshold_hours) {
        continue;
      }

      // Check if already notified for this clock entry and threshold
      const notificationKey = `${entry.id}_${setting.threshold_hours}`;
      if (sentSet.has(notificationKey)) {
        console.log(`Already notified for clock entry ${entry.id}`);
        continue;
      }

      const employee = employeeMap.get(entry.employee_id);
      if (!employee) continue;

      const employeeName = `${employee.first_name} ${employee.last_name}`;
      const hoursFormatted = Math.floor(hoursWorked);
      const settingType = isUsingGlobal ? 'global' : 'individual';

      console.log(`Employee ${employeeName} has been clocked in for ${hoursFormatted} hours (threshold: ${setting.threshold_hours}, setting: ${settingType})`);

      // Collect user IDs to notify
      const userIdsToNotify: string[] = [];

      if (setting.notify_employee && employee.user_id) {
        userIdsToNotify.push(employee.user_id);
      }

      if (setting.notify_admins) {
        for (const adminId of adminUserIds) {
          if (!userIdsToNotify.includes(adminId)) {
            userIdsToNotify.push(adminId);
          }
        }
      }

      if (userIdsToNotify.length === 0) {
        console.log('No users to notify');
        continue;
      }

      // Get device tokens for these users
      const { data: deviceTokens, error: tokensError } = await supabase
        .from('push_device_tokens')
        .select('user_id, player_id')
        .in('user_id', userIdsToNotify)
        .eq('is_active', true);

      if (tokensError) {
        console.error('Error fetching device tokens:', tokensError);
        continue;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log('No device tokens found');
        continue;
      }

      const playerIds = (deviceTokens as DeviceToken[]).map((t) => t.player_id);

      // Determine notification content based on recipient
      const title = 'Overtime Alert';
      const body = employee.user_id && userIdsToNotify.includes(employee.user_id)
        ? `You have been clocked in for ${hoursFormatted} hours`
        : `${employeeName} has been clocked in for ${hoursFormatted} hours`;

      // Send notification via OneSignal
      try {
        const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${onesignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: onesignalAppId,
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: body },
            ios_sound: 'default',
            data: {
              type: 'overtime_alert',
              employee_id: entry.employee_id,
              time_clock_id: entry.id,
              hours_worked: hoursFormatted,
            },
          }),
        });

        if (!onesignalResponse.ok) {
          const errorText = await onesignalResponse.text();
          console.error('OneSignal error:', errorText);
          continue;
        }

        const onesignalData = await onesignalResponse.json();
        console.log('OneSignal notification sent:', onesignalData.id);

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

        // Log notifications
        for (const userId of userIdsToNotify) {
          await supabase.from('notifications_log').insert({
            user_id: userId,
            notification_type: 'shift_status',
            title,
            body,
            onesignal_id: onesignalData.id,
            data: {
              type: 'overtime_alert',
              employee_id: entry.employee_id,
              time_clock_id: entry.id,
            },
          });
        }

        notifiedCount++;
      } catch (sendError) {
        console.error('Error sending notification:', sendError);
      }
    }

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
