import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_ids?: string[];
  notification_type: "shift_status" | "geofence_alert" | "admin_announcement";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // For broadcast to all users (admin announcements)
  broadcast?: boolean;
}

interface NotificationPreference {
  user_id: string;
  shift_status_enabled: boolean;
  geofence_alerts_enabled: boolean;
  admin_announcements_enabled: boolean;
  notification_sound: string;
  mandatory_shift_status: boolean;
  mandatory_geofence_alerts: boolean;
  mandatory_admin_announcements: boolean;
}

interface DeviceToken {
  user_id: string;
  player_id: string;
  platform: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID")!;
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error("Missing OneSignal credentials");
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is admin or manager
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or manager
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdminOrManager = roles?.some(r => r.role === "admin" || r.role === "manager");
    
    if (!isAdminOrManager) {
      return new Response(
        JSON.stringify({ error: "Only admins and managers can send notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: NotificationPayload = await req.json();
    console.log("Notification payload:", JSON.stringify(payload));

    const { user_ids, notification_type, title, body, data, broadcast } = payload;

    // Get target users
    let targetUserIds: string[] = [];
    
    if (broadcast) {
      // Get all active user IDs with device tokens
      const { data: tokens } = await supabase
        .from("push_device_tokens")
        .select("user_id")
        .eq("is_active", true);
      
      targetUserIds = [...new Set(tokens?.map(t => t.user_id) || [])];
    } else if (user_ids && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to ${targetUserIds.length} users`);

    // Get notification preferences for all target users
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("user_id", targetUserIds) as { data: NotificationPreference[] | null };

    // Filter users based on their preferences
    const prefsMap = new Map(preferences?.map(p => [p.user_id, p]) || []);
    
    const eligibleUserIds = targetUserIds.filter(userId => {
      const prefs = prefsMap.get(userId);
      // If no preferences set, default to enabled
      if (!prefs) return true;
      
      switch (notification_type) {
        case "shift_status":
          // Send if mandatory OR user has it enabled
          return prefs.mandatory_shift_status || prefs.shift_status_enabled;
        case "geofence_alert":
          return prefs.mandatory_geofence_alerts || prefs.geofence_alerts_enabled;
        case "admin_announcement":
          return prefs.mandatory_admin_announcements || prefs.admin_announcements_enabled;
        default:
          return true;
      }
    });

    console.log(`${eligibleUserIds.length} users have this notification type enabled`);

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: "No eligible users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get device tokens for eligible users
    const { data: deviceTokens } = await supabase
      .from("push_device_tokens")
      .select("*")
      .in("user_id", eligibleUserIds)
      .eq("is_active", true) as { data: DeviceToken[] | null };

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("No active device tokens found");
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: "No active device tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate player IDs (same player_id might be registered for multiple users)
    const uniquePlayerIds = [...new Set(deviceTokens.map(t => t.player_id))];
    console.log(`Sending to ${uniquePlayerIds.length} unique devices (${deviceTokens.length} total tokens)`);

    // Map notification sounds
    const soundMap: Record<string, string> = {
      default: "default",
      chime: "chime.wav",
      bell: "bell.wav", 
      alert: "alert.wav",
      none: "",
    };

    // Get the first user's sound preference (for now, use first eligible user's preference)
    const firstUserPrefs = prefsMap.get(eligibleUserIds[0]);
    const iosSound = soundMap[firstUserPrefs?.notification_sound || "default"] || "default";

    // Send via OneSignal
    const oneSignalPayload = {
      app_id: oneSignalAppId,
      include_player_ids: uniquePlayerIds,
      headings: { en: title },
      contents: { en: body },
      data: {
        ...data,
        notification_type,
      },
      ios_sound: iosSound,
    };

    console.log("OneSignal payload:", JSON.stringify(oneSignalPayload));

    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const oneSignalResult = await oneSignalResponse.json();
    console.log("OneSignal response:", JSON.stringify(oneSignalResult));

    // Handle invalid player IDs - deactivate them in our database
    if (oneSignalResult.errors?.invalid_player_ids) {
      const invalidIds = oneSignalResult.errors.invalid_player_ids as string[];
      console.log(`Found ${invalidIds.length} invalid player IDs, deactivating:`, invalidIds);
      
      // Mark invalid tokens as inactive so they won't be used again
      const { error: deactivateError } = await supabase
        .from("push_device_tokens")
        .update({ is_active: false })
        .in("player_id", invalidIds);
      
      if (deactivateError) {
        console.error("Error deactivating invalid tokens:", deactivateError);
      } else {
        console.log(`Deactivated ${invalidIds.length} invalid tokens`);
      }
      
      // Check if ALL tokens were invalid
      const validCount = uniquePlayerIds.length - invalidIds.length;
      if (validCount <= 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            sent_count: 0,
            error: "All device tokens are invalid. Users need to re-enable push notifications.",
            invalid_count: invalidIds.length,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!oneSignalResponse.ok && !oneSignalResult.id) {
      console.error("OneSignal error:", oneSignalResult);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", details: oneSignalResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate actual sent count
    const invalidCount = oneSignalResult.errors?.invalid_player_ids?.length || 0;
    const actualSentCount = uniquePlayerIds.length - invalidCount;

    // Log notifications for each user
    const notificationLogs = eligibleUserIds.map(userId => ({
      user_id: userId,
      notification_type,
      title,
      body,
      data,
      onesignal_id: oneSignalResult.id || null,
      delivery_status: actualSentCount > 0 ? 'sent' : 'failed',
    }));

    await supabase.from("notifications_log").insert(notificationLogs);

    return new Response(
      JSON.stringify({
        success: actualSentCount > 0,
        sent_count: actualSentCount,
        onesignal_id: oneSignalResult.id || null,
        invalid_tokens_removed: invalidCount,
        message: invalidCount > 0 
          ? `Sent to ${actualSentCount} device(s). ${invalidCount} invalid token(s) were removed.`
          : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
