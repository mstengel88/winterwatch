import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID")!;
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { equipment_name, problem_description, driver_name } = await req.json();
    console.log(`Maintenance request from ${driver_name} for ${equipment_name}`);

    const title = "🔧 New Maintenance Request";
    const body = `${driver_name} reported an issue with ${equipment_name}: ${problem_description.substring(0, 100)}`;

    // Get all admin and manager user IDs
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    const adminUserIds = [...new Set(adminRoles?.map((r) => r.user_id) || [])];
    console.log(`Found ${adminUserIds.length} admin/manager users to notify`);

    if (adminUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: "No admins found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log notifications for bell icon (in-app)
    const notificationLogs = adminUserIds.map((userId) => ({
      user_id: userId,
      notification_type: "admin_announcement" as const,
      title,
      body,
      data: { type: "maintenance_request" },
      delivery_status: "sent",
    }));

    const { error: logError } = await supabase.from("notifications_log").insert(notificationLogs);
    if (logError) {
      console.error("Error logging notifications:", logError);
    }

    // Send push notification via OneSignal
    if (!oneSignalAppId || !oneSignalApiKey) {
      console.warn("OneSignal not configured, skipping push");
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: "Push not configured, in-app logged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get device tokens for admin/manager users
    const { data: deviceTokens } = await supabase
      .from("push_device_tokens")
      .select("player_id")
      .in("user_id", adminUserIds)
      .eq("is_active", true);

    const playerIds = [...new Set(deviceTokens?.map((t) => t.player_id) || [])];
    console.log(`Sending push to ${playerIds.length} devices`);

    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: "No active devices, in-app logged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneSignalPayload = {
      app_id: oneSignalAppId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data: { notification_type: "admin_announcement", type: "maintenance_request" },
      ios_sound: "default",
    };

    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const oneSignalResult = await oneSignalResponse.json();
    console.log("OneSignal response:", JSON.stringify(oneSignalResult));

    // Clean up invalid tokens
    if (oneSignalResult.errors?.invalid_player_ids) {
      const invalidIds = oneSignalResult.errors.invalid_player_ids as string[];
      await supabase
        .from("push_device_tokens")
        .update({ is_active: false })
        .in("player_id", invalidIds);
      console.log(`Deactivated ${invalidIds.length} invalid tokens`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: playerIds.length,
        onesignal_id: oneSignalResult.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
