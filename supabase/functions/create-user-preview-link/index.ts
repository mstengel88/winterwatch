import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PreviewRequest = {
  target_user_id?: string;
  redirect_to?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: requesterAuth, error: requesterAuthError } = await requesterClient.auth.getUser();
    if (requesterAuthError || !requesterAuth.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requester = requesterAuth.user;
    const body = (await req.json()) as PreviewRequest;
    const targetUserId = body.target_user_id?.trim();
    const redirectTo = body.redirect_to?.trim();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "target_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterRoles, error: requesterRolesError } = await adminClient
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", requester.id);

    if (requesterRolesError) {
      throw requesterRolesError;
    }

    const isAdmin = (requesterRoles ?? []).some((row) => row.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can create preview links." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      throw targetProfileError;
    }

    if (!targetProfile?.email) {
      return new Response(JSON.stringify({ error: "That user does not have a sign-in email on file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetProfile.email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      throw linkError;
    }

    const requesterOrganizationId =
      requesterRoles?.find((row) => row.role === "admin")?.organization_id ?? null;

    const { error: auditError } = await adminClient.from("audit_logs").insert({
      table_name: "user_preview_links",
      record_id: targetUserId,
      action: "INSERT",
      changed_fields: ["preview_link_created"],
      user_id: requester.id,
      user_email: requester.email ?? null,
      old_data: null,
      new_data: {
        target_user_id: targetUserId,
        target_email: targetProfile.email,
        target_name: targetProfile.full_name,
        generated_at: new Date().toISOString(),
        generated_by: requester.id,
      },
      organization_id: requesterOrganizationId,
    });

    if (auditError) {
      console.error("Failed to write preview-link audit log:", auditError);
    }

    return new Response(JSON.stringify({
      action_link: linkData.properties.action_link,
      email_otp: linkData.properties.email_otp,
      redirect_to: linkData.properties.redirect_to,
      target_user: {
        id: targetProfile.id,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
      },
      warning: "Opening this link on the same browser session will switch you into that user account.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-user-preview-link error:", error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unexpected error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
