import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole =
  | "admin"
  | "manager"
  | "driver"
  | "dispatch_driver"
  | "shovel_crew"
  | "trucker"
  | "client"
  | "work_log_viewer";

type EmployeeCategory = "plow" | "shovel" | "both" | "manager" | "trucker";

type InviteWorkspaceUserPayload = {
  organization_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: AppRole;
  create_employee?: boolean;
  employee_category?: EmployeeCategory;
  employee_id?: string;
  invite_redirect_to?: string;
};

function cleanText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: "New", last_name: "User" };
  }
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "User" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

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

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requesterAuth, error: requesterAuthError } = await requesterClient.auth.getUser();
    if (requesterAuthError || !requesterAuth.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requester = requesterAuth.user;
    const body = (await req.json()) as InviteWorkspaceUserPayload;
    const organizationId = body.organization_id?.trim();
    const fullName = body.full_name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = cleanText(body.phone);
    const role = body.role;
    const createEmployee = Boolean(body.create_employee);
    const employeeCategory = body.employee_category ?? "manager";
    const employeeId = cleanText(body.employee_id);
    const inviteRedirectTo = cleanText(body.invite_redirect_to);

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fullName || !email || !role) {
      return new Response(JSON.stringify({ error: "full_name, email, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterRoles, error: requesterRolesError } = await adminClient
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", requester.id)
      .eq("organization_id", organizationId);

    if (requesterRolesError) {
      throw requesterRolesError;
    }

    const canManageWorkspace = (requesterRoles ?? []).some((row) =>
      row.role === "admin" || row.role === "manager"
    );

    if (!canManageWorkspace) {
      return new Response(JSON.stringify({ error: "Only admins or managers can invite workspace users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: matchingProfiles, error: profileLookupError } = await adminClient
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", email);

    if (profileLookupError) {
      throw profileLookupError;
    }

    let profileId = matchingProfiles?.[0]?.id ?? null;
    let invited = false;

    if (!profileId) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: { full_name: fullName },
          redirectTo: inviteRedirectTo ?? undefined,
        },
      );

      if (inviteError) {
        throw inviteError;
      }

      profileId = inviteData.user?.id ?? null;
      invited = true;
    }

    if (!profileId) {
      throw new Error(`Unable to resolve user for ${email}`);
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        active_organization_id: organizationId,
      })
      .eq("id", profileId);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .upsert(
        {
          user_id: profileId,
          role,
          organization_id: organizationId,
          created_by: requester.id,
        },
        { onConflict: "organization_id,user_id,role" },
      );

    if (roleInsertError) {
      throw roleInsertError;
    }

    let employeeCreated = false;
    let linkedEmployeeId = employeeId;

    if (employeeId) {
      const { data: existingEmployee, error: existingEmployeeError } = await adminClient
        .from("employees")
        .select("id, user_id")
        .eq("id", employeeId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingEmployeeError && existingEmployeeError.code !== "PGRST116") {
        throw existingEmployeeError;
      }

      if (!existingEmployee) {
        return new Response(JSON.stringify({ error: "Employee record not found in this organization." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existingEmployee.user_id && existingEmployee.user_id !== profileId) {
        return new Response(JSON.stringify({ error: "That employee is already linked to another user." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: employeeLinkError } = await adminClient
        .from("employees")
        .update({
          user_id: profileId,
          email,
          phone,
        })
        .eq("id", employeeId)
        .eq("organization_id", organizationId);

      if (employeeLinkError) {
        throw employeeLinkError;
      }
    }

    if (createEmployee) {
      const { data: existingEmployee, error: existingEmployeeError } = await adminClient
        .from("employees")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", profileId)
        .maybeSingle();

      if (existingEmployeeError && existingEmployeeError.code !== "PGRST116") {
        throw existingEmployeeError;
      }

      if (!existingEmployee && !employeeId) {
        const nameParts = splitName(fullName);
        const { data: insertedEmployee, error: employeeInsertError } = await adminClient
          .from("employees")
          .insert({
            user_id: profileId,
            organization_id: organizationId,
            first_name: nameParts.first_name,
            last_name: nameParts.last_name,
            email,
            phone,
            category: employeeCategory,
            is_active: true,
          })
          .select("id")
          .single();

        if (employeeInsertError) {
          throw employeeInsertError;
        }

        employeeCreated = true;
        linkedEmployeeId = insertedEmployee.id;
      }
    }

    const { error: auditError } = await adminClient.from("audit_logs").insert({
      table_name: "workspace_user_invites",
      record_id: profileId,
      action: "INSERT",
      changed_fields: ["role", "organization_id", "employee_created", "invited"],
      user_id: requester.id,
      user_email: requester.email ?? null,
      old_data: null,
      new_data: {
        user_id: profileId,
        email,
        full_name: fullName,
        role,
        invited,
        employee_created: employeeCreated,
        employee_id: linkedEmployeeId,
      },
      organization_id: organizationId,
    });

    if (auditError) {
      console.error("Failed to write invite-workspace-user audit log:", auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: profileId,
        email,
        full_name: fullName,
      },
      role,
      invited,
      employee_created: employeeCreated,
      employee_id: linkedEmployeeId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("invite-workspace-user error:", error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unexpected error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
