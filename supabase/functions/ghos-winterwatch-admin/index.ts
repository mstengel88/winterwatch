import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

type JsonRecord = Record<string, unknown>;

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// This is a one-way SHA-256 fingerprint, not the integration secret.
// Rotate it together with the server-managed GHOS secret.
const fallbackIntegrationSecretHash =
  "5b499ec098e5528e6da0b5297766e90f2085e87990eca05c80240a539b59b033";

const allowedRoles = new Set([
  "admin",
  "manager",
  "driver",
  "dispatch_driver",
  "shovel_crew",
  "trucker",
  "client",
  "work_log_viewer",
]);

const allowedEmployeeCategories = new Set([
  "plow",
  "shovel",
  "both",
  "manager",
  "trucker",
]);

function response(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(value: unknown, field: string): string {
  const cleaned = cleanText(value);
  if (!cleaned) throw new Error(`${field} is required.`);
  return cleaned;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function constantTimeEquals(
  left: string,
  right: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function splitName(fullName: string): {
  first_name: string;
  last_name: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { first_name: parts[0] || "New", last_name: "User" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.at(-1) || "User",
  };
}

function normalizeAccount(
  input: JsonRecord,
  organizationId: string,
): JsonRecord {
  const serviceType = cleanText(input.service_type) || "both";
  if (!["plow", "shovel", "both"].includes(serviceType)) {
    throw new Error("service_type must be plow, shovel, or both.");
  }

  return {
    organization_id: organizationId,
    name: requiredText(input.name, "Account name"),
    address: requiredText(input.address, "Account address"),
    city: cleanText(input.city),
    state: cleanText(input.state) || "WI",
    zip: cleanText(input.zip),
    contact_name: cleanText(input.contact_name),
    contact_phone: cleanText(input.contact_phone),
    contact_email: cleanText(input.contact_email)?.toLowerCase() || null,
    latitude: typeof input.latitude === "number" ? input.latitude : null,
    longitude: typeof input.longitude === "number" ? input.longitude : null,
    geofence_radius:
      typeof input.geofence_radius === "number"
        ? Math.min(1000, Math.max(25, Math.round(input.geofence_radius)))
        : 100,
    priority:
      typeof input.priority === "number"
        ? Math.min(10, Math.max(1, Math.round(input.priority)))
        : 5,
    service_type: serviceType,
    notes: cleanText(input.notes),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function audit(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  recordId: string,
  action: string,
  actor: string,
  newData: JsonRecord,
): Promise<void> {
  const { error } = await adminClient.from("audit_logs").insert({
    table_name: "ghos_winterwatch_admin",
    record_id: recordId,
    action,
    changed_fields: Object.keys(newData),
    user_id: null,
    user_email: actor,
    old_data: null,
    new_data: newData,
    organization_id: organizationId,
  });
  if (error) console.error("GHOS audit write failed", error);
}

async function provisionUser(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  input: JsonRecord,
  redirectTo: string | null,
): Promise<JsonRecord> {
  const fullName = requiredText(input.full_name, "Full name");
  const email = requiredText(input.email, "Email").toLowerCase();
  const role = requiredText(input.role, "Role");
  if (!allowedRoles.has(role)) throw new Error("The selected role is invalid.");

  const { data: matchingProfiles, error: lookupError } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("email", email);
  if (lookupError) throw lookupError;

  let userId = matchingProfiles?.[0]?.id ?? null;
  let invited = false;
  if (!userId) {
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName },
        redirectTo: redirectTo || undefined,
      },
    );
    if (error) throw error;
    userId = data.user?.id ?? null;
    invited = true;
  }
  if (!userId) throw new Error(`Unable to create or find ${email}.`);

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      phone: cleanText(input.phone),
      active_organization_id: organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  const { error: roleError } = await adminClient.from("user_roles").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role,
      created_by: null,
    },
    { onConflict: "organization_id,user_id,role" },
  );
  if (roleError) throw roleError;

  let employeeId: string | null = null;
  if (input.create_employee === true) {
    const category = cleanText(input.employee_category) || "both";
    if (!allowedEmployeeCategories.has(category)) {
      throw new Error("The selected employee category is invalid.");
    }
    const { data: existingEmployee, error: employeeLookupError } =
      await adminClient
        .from("employees")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
    if (employeeLookupError && employeeLookupError.code !== "PGRST116") {
      throw employeeLookupError;
    }

    employeeId = existingEmployee?.id ?? null;
    if (!employeeId) {
      const names = splitName(fullName);
      const { data, error } = await adminClient
        .from("employees")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          first_name: names.first_name,
          last_name: names.last_name,
          email,
          phone: cleanText(input.phone),
          category,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      employeeId = data.id;
    }
  }

  return {
    id: userId,
    email,
    full_name: fullName,
    role,
    invited,
    employee_id: employeeId,
  };
}

async function listOrganizations(
  adminClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const [organizationsResult, rolesResult, accountsResult, employeesResult] =
    await Promise.all([
      adminClient
        .from("organizations")
        .select("id,name,slug,plan,status,created_at")
        .order("name"),
      adminClient.from("user_roles").select("organization_id,user_id"),
      adminClient.from("accounts").select("organization_id,id"),
      adminClient.from("employees").select("organization_id,id"),
    ]);

  for (const result of [
    organizationsResult,
    rolesResult,
    accountsResult,
    employeesResult,
  ]) {
    if (result.error) throw result.error;
  }

  const userSets = new Map<string, Set<string>>();
  const accountCounts = new Map<string, number>();
  const employeeCounts = new Map<string, number>();
  for (const row of rolesResult.data ?? []) {
    const set = userSets.get(row.organization_id) ?? new Set<string>();
    set.add(row.user_id);
    userSets.set(row.organization_id, set);
  }
  for (const row of accountsResult.data ?? []) {
    accountCounts.set(
      row.organization_id,
      (accountCounts.get(row.organization_id) ?? 0) + 1,
    );
  }
  for (const row of employeesResult.data ?? []) {
    employeeCounts.set(
      row.organization_id,
      (employeeCounts.get(row.organization_id) ?? 0) + 1,
    );
  }

  return response({
    success: true,
    organizations: (organizationsResult.data ?? []).map((organization) => ({
      ...organization,
      user_count: userSets.get(organization.id)?.size ?? 0,
      account_count: accountCounts.get(organization.id) ?? 0,
      employee_count: employeeCounts.get(organization.id) ?? 0,
    })),
  });
}

async function getWorkspace(
  adminClient: ReturnType<typeof createClient>,
  payload: JsonRecord,
): Promise<Response> {
  const organizationId = requiredText(
    payload.organization_id,
    "organization_id",
  );
  const [organizationResult, rolesResult, accountsResult, employeesResult] =
    await Promise.all([
      adminClient
        .from("organizations")
        .select("id,name,slug,plan,status,created_at")
        .eq("id", organizationId)
        .single(),
      adminClient
        .from("user_roles")
        .select("user_id,role")
        .eq("organization_id", organizationId),
      adminClient
        .from("accounts")
        .select(
          "id,name,address,city,state,zip,contact_name,contact_phone,contact_email,priority,geofence_radius,service_type,notes,is_active",
        )
        .eq("organization_id", organizationId)
        .order("priority")
        .order("name"),
      adminClient
        .from("employees")
        .select("id,user_id,is_active")
        .eq("organization_id", organizationId),
    ]);

  for (const result of [
    organizationResult,
    rolesResult,
    accountsResult,
    employeesResult,
  ]) {
    if (result.error) throw result.error;
  }

  const userIds = [
    ...new Set((rolesResult.data ?? []).map((row) => row.user_id)),
  ];
  const profilesResult =
    userIds.length > 0
      ? await adminClient
          .from("profiles")
          .select("id,email,full_name,phone")
          .in("id", userIds)
      : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;

  const rolesByUser = new Map(
    (rolesResult.data ?? []).map((row) => [row.user_id, row.role]),
  );
  const employeeByUser = new Map(
    (employeesResult.data ?? [])
      .filter((row) => row.user_id)
      .map((row) => [row.user_id, row]),
  );
  const users = (profilesResult.data ?? []).map((profile) => ({
    ...profile,
    email: profile.email ?? "",
    full_name: profile.full_name ?? profile.email ?? "WinterWatch user",
    role: rolesByUser.get(profile.id) ?? "client",
    employee_id: employeeByUser.get(profile.id)?.id ?? null,
    employee_active: employeeByUser.get(profile.id)?.is_active ?? null,
  }));

  return response({
    success: true,
    workspace: {
      organization: {
        ...organizationResult.data,
        user_count: users.length,
        account_count: accountsResult.data?.length ?? 0,
        employee_count: employeesResult.data?.length ?? 0,
      },
      users,
      accounts: accountsResult.data ?? [],
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return response({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    const expectedSecret = Deno.env
      .get("GHOS_ADMIN_INTEGRATION_SECRET")
      ?.trim();
    const receivedSecret =
      request.headers.get("x-ghos-integration-secret")?.trim() ?? "";
    const validSecret = expectedSecret
      ? await constantTimeEquals(receivedSecret, expectedSecret)
      : await constantTimeEquals(
          await sha256Hex(receivedSecret),
          fallbackIntegrationSecretHash,
        );
    if (!receivedSecret || !validSecret) {
      return response({ success: false, error: "Unauthorized." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service configuration is unavailable.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = (await request.json()) as {
      action?: string;
      payload?: JsonRecord;
      invite_redirect_to?: string;
    };
    const action = cleanText(body.action);
    const payload = body.payload ?? {};
    const actor =
      cleanText(request.headers.get("x-ghos-actor")) ?? "GHOS administrator";
    const redirectTo = cleanText(body.invite_redirect_to);

    if (action === "health") {
      return response({ success: true });
    }
    if (action === "list_organizations") {
      return await listOrganizations(adminClient);
    }
    if (action === "get_workspace") {
      return await getWorkspace(adminClient, payload);
    }
    if (action === "onboard") {
      const organizationInput =
        (payload.organization as JsonRecord | undefined) ?? {};
      const organizationName = requiredText(
        organizationInput.name,
        "Organization name",
      );
      const requestedSlug = slugify(
        cleanText(organizationInput.slug) ?? organizationName,
      );
      if (!requestedSlug) throw new Error("Organization slug is invalid.");

      const { data: existingSlugs, error: slugError } = await adminClient
        .from("organizations")
        .select("slug");
      if (slugError) throw slugError;
      const usedSlugs = new Set((existingSlugs ?? []).map((row) => row.slug));
      let slug = requestedSlug;
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = `${requestedSlug}-${suffix}`;
        suffix += 1;
      }

      const { data: organization, error: organizationError } = await adminClient
        .from("organizations")
        .insert({
          name: organizationName,
          slug,
          plan: cleanText(organizationInput.plan) || "launch",
          status: cleanText(organizationInput.status) || "active",
        })
        .select("id,name,slug,plan,status,created_at")
        .single();
      if (organizationError) throw organizationError;

      const primaryContact = payload.primary_contact as
        | JsonRecord
        | null
        | undefined;
      let user: JsonRecord | null = null;
      if (primaryContact) {
        user = await provisionUser(
          adminClient,
          organization.id,
          primaryContact,
          redirectTo,
        );
      }

      const createdAccounts: JsonRecord[] = [];
      for (const rawAccount of (payload.accounts as JsonRecord[] | undefined) ??
        []) {
        const account = normalizeAccount(rawAccount, organization.id);
        const { data, error } = await adminClient
          .from("accounts")
          .insert(account)
          .select("*")
          .single();
        if (error) throw error;
        createdAccounts.push(data);
      }

      await audit(
        adminClient,
        organization.id,
        organization.id,
        "INSERT",
        actor,
        {
          organization,
          primary_contact: user,
          account_count: createdAccounts.length,
        },
      );
      return response({
        success: true,
        organization: {
          ...organization,
          user_count: user ? 1 : 0,
          account_count: createdAccounts.length,
          employee_count: primaryContact?.create_employee === true ? 1 : 0,
        },
        user,
      });
    }
    if (action === "update_organization") {
      const organizationId = requiredText(
        payload.organization_id,
        "organization_id",
      );
      const update = {
        name: requiredText(payload.name, "Organization name"),
        slug: slugify(requiredText(payload.slug, "Organization slug")),
        plan: requiredText(payload.plan, "Plan"),
        status: requiredText(payload.status, "Status"),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await adminClient
        .from("organizations")
        .update(update)
        .eq("id", organizationId)
        .select("id,name,slug,plan,status,created_at")
        .single();
      if (error) throw error;
      await audit(
        adminClient,
        organizationId,
        organizationId,
        "UPDATE",
        actor,
        update,
      );
      return response({ success: true, organization: data });
    }
    if (action === "save_account") {
      const organizationId = requiredText(
        payload.organization_id,
        "organization_id",
      );
      const rawAccount = (payload.account as JsonRecord | undefined) ?? {};
      const accountId = cleanText(rawAccount.id);
      const normalized = normalizeAccount(rawAccount, organizationId);
      const query = accountId
        ? adminClient
            .from("accounts")
            .update(normalized)
            .eq("id", accountId)
            .eq("organization_id", organizationId)
        : adminClient.from("accounts").insert(normalized);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      await audit(
        adminClient,
        organizationId,
        data.id,
        accountId ? "UPDATE" : "INSERT",
        actor,
        normalized,
      );
      return response({ success: true, account: data });
    }
    if (action === "invite_user") {
      const organizationId = requiredText(
        payload.organization_id,
        "organization_id",
      );
      const user = await provisionUser(
        adminClient,
        organizationId,
        payload,
        redirectTo,
      );
      await audit(
        adminClient,
        organizationId,
        user.id as string,
        "INSERT",
        actor,
        user,
      );
      return response({ success: true, user });
    }
    if (action === "update_user_access") {
      const organizationId = requiredText(
        payload.organization_id,
        "organization_id",
      );
      const userId = requiredText(payload.user_id, "user_id");
      const hasAccess = payload.has_access !== false;
      const role = requiredText(payload.role, "Role");
      if (!allowedRoles.has(role))
        throw new Error("The selected role is invalid.");

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({
          full_name: cleanText(payload.full_name),
          phone: cleanText(payload.phone),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      if (hasAccess) {
        const { error: insertError } = await adminClient
          .from("user_roles")
          .insert({
            organization_id: organizationId,
            user_id: userId,
            role,
            created_by: null,
          });
        if (insertError) throw insertError;
      }

      const change = { user_id: userId, role, has_access: hasAccess };
      await audit(
        adminClient,
        organizationId,
        userId,
        hasAccess ? "UPDATE" : "DELETE",
        actor,
        change,
      );
      return response({ success: true, user: change });
    }

    return response({ success: false, error: "Unknown action." }, 400);
  } catch (error) {
    console.error("GHOS WinterWatch administration failed", error);
    return response(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      500,
    );
  }
});
