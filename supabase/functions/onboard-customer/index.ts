import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "manager" | "driver" | "dispatch_driver" | "shovel_crew" | "trucker" | "client" | "work_log_viewer";
type EmployeeCategory = "plow" | "shovel" | "both" | "manager" | "trucker";
type ServiceType = "plow" | "shovel" | "both";

interface PrimaryContactInput {
  email: string;
  full_name: string;
  phone?: string;
  role: Extract<AppRole, "admin" | "manager" | "client">;
  create_employee?: boolean;
  employee_category?: EmployeeCategory;
  hourly_rate?: number | null;
  hire_date?: string | null;
  notes?: string | null;
}

interface EmployeeInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  category: EmployeeCategory;
  hourly_rate?: number | null;
  hire_date?: string | null;
  notes?: string | null;
}

interface AccountInput {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius?: number | null;
  priority?: number | null;
  service_type?: ServiceType;
  notes?: string | null;
  is_active?: boolean;
}

interface OnboardCustomerPayload {
  organization: {
    name: string;
    slug?: string;
    plan?: string;
    status?: string;
  };
  primary_contact?: PrimaryContactInput | null;
  employees?: EmployeeInput[];
  accounts?: AccountInput[];
  options?: {
    assign_primary_contact_to_accounts?: boolean;
    invite_redirect_to?: string;
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;

  let attempt = 2;
  while (existing.has(`${base}-${attempt}`)) {
    attempt += 1;
  }
  return `${base}-${attempt}`;
}

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterRoles, error: requesterRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (requesterRoleError) {
      throw requesterRoleError;
    }

    const canManageCustomers = (requesterRoles || []).some((row) =>
      row.role === "admin" || row.role === "manager"
    );

    if (!canManageCustomers) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as OnboardCustomerPayload;
    const organizationName = payload.organization?.name?.trim();

    if (!organizationName) {
      return new Response(JSON.stringify({ error: "Organization name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedSlug = slugify(payload.organization.slug || organizationName);
    if (!requestedSlug) {
      return new Response(JSON.stringify({ error: "Organization slug is invalid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingOrganizations, error: existingOrganizationsError } = await supabase
      .from("organizations")
      .select("slug");

    if (existingOrganizationsError) {
      throw existingOrganizationsError;
    }

    const slug = uniqueSlug(
      requestedSlug,
      new Set((existingOrganizations || []).map((row) => row.slug)),
    );

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        slug,
        status: payload.organization.status?.trim() || "active",
        plan: payload.organization.plan?.trim() || "launch",
      })
      .select("id, name, slug, status, plan")
      .single();

    if (organizationError) {
      throw organizationError;
    }

    let primaryContactSummary:
      | { id: string; email: string; role: string; invited: boolean; employee_created: boolean }
      | null = null;
    let primaryContactUserId: string | null = null;

    if (payload.primary_contact?.email?.trim()) {
      const primaryContact = payload.primary_contact;
      const normalizedEmail = primaryContact.email.trim().toLowerCase();

      const { data: matchingProfiles, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone")
        .ilike("email", normalizedEmail);

      if (profileLookupError) {
        throw profileLookupError;
      }

      let invited = false;
      let profileId = matchingProfiles?.[0]?.id ?? null;

      if (!profileId) {
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          normalizedEmail,
          {
            data: { full_name: primaryContact.full_name.trim() },
            redirectTo: cleanText(payload.options?.invite_redirect_to) ?? undefined,
          },
        );

        if (inviteError) {
          throw inviteError;
        }

        profileId = inviteData.user?.id ?? null;
        invited = true;
      }

      if (!profileId) {
        throw new Error("Unable to resolve primary contact user");
      }

      primaryContactUserId = profileId;

      await supabase
        .from("profiles")
        .update({
          full_name: cleanText(primaryContact.full_name),
          phone: cleanText(primaryContact.phone),
          active_organization_id: organization.id,
        })
        .eq("id", profileId);

      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: profileId,
            role: primaryContact.role,
            organization_id: organization.id,
            created_by: user.id,
          },
          { onConflict: "organization_id,user_id,role" },
        );

      if (roleInsertError) {
        throw roleInsertError;
      }

      let employeeCreated = false;
      if (primaryContact.create_employee) {
        const { data: existingEmployee, error: existingEmployeeError } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", profileId)
          .maybeSingle();

        if (existingEmployeeError && existingEmployeeError.code !== "PGRST116") {
          throw existingEmployeeError;
        }

        if (!existingEmployee) {
          const nameParts = splitName(primaryContact.full_name);
          const { error: employeeInsertError } = await supabase.from("employees").insert({
            user_id: profileId,
            organization_id: organization.id,
            first_name: nameParts.first_name,
            last_name: nameParts.last_name,
            email: normalizedEmail,
            phone: cleanText(primaryContact.phone),
            category: primaryContact.employee_category || "manager",
            hourly_rate: primaryContact.hourly_rate ?? null,
            hire_date: cleanText(primaryContact.hire_date),
            notes: cleanText(primaryContact.notes),
            is_active: true,
          });

          if (employeeInsertError) {
            throw employeeInsertError;
          }

          employeeCreated = true;
        }
      }

      primaryContactSummary = {
        id: profileId,
        email: normalizedEmail,
        role: primaryContact.role,
        invited,
        employee_created: employeeCreated,
      };
    }

    const createdEmployees: Array<{ id: string; name: string; category: string }> = [];
    for (const employee of payload.employees || []) {
      if (!employee.first_name.trim() || !employee.last_name.trim()) {
        continue;
      }

      const { data: createdEmployee, error: employeeError } = await supabase
        .from("employees")
        .insert({
          organization_id: organization.id,
          first_name: employee.first_name.trim(),
          last_name: employee.last_name.trim(),
          email: cleanText(employee.email),
          phone: cleanText(employee.phone),
          category: employee.category,
          hourly_rate: employee.hourly_rate ?? null,
          hire_date: cleanText(employee.hire_date),
          notes: cleanText(employee.notes),
          is_active: true,
        })
        .select("id, first_name, last_name, category")
        .single();

      if (employeeError) {
        throw employeeError;
      }

      createdEmployees.push({
        id: createdEmployee.id,
        name: `${createdEmployee.first_name} ${createdEmployee.last_name}`,
        category: createdEmployee.category,
      });
    }

    const createdAccounts: Array<{ id: string; name: string; service_type: string }> = [];
    for (const account of payload.accounts || []) {
      if (!account.name.trim() || !account.address.trim()) {
        continue;
      }

      const { data: createdAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          organization_id: organization.id,
          client_id:
            payload.options?.assign_primary_contact_to_accounts && primaryContactUserId
              ? primaryContactUserId
              : null,
          name: account.name.trim(),
          address: account.address.trim(),
          city: cleanText(account.city),
          state: cleanText(account.state),
          zip: cleanText(account.zip),
          contact_name: cleanText(account.contact_name),
          contact_phone: cleanText(account.contact_phone),
          contact_email: cleanText(account.contact_email),
          latitude: account.latitude ?? null,
          longitude: account.longitude ?? null,
          geofence_radius: account.geofence_radius ?? 100,
          priority: account.priority ?? 5,
          service_type: account.service_type ?? "both",
          notes: cleanText(account.notes),
          is_active: account.is_active ?? true,
        })
        .select("id, name, service_type")
        .single();

      if (accountError) {
        throw accountError;
      }

      createdAccounts.push({
        id: createdAccount.id,
        name: createdAccount.name,
        service_type: createdAccount.service_type ?? "both",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization,
        primary_contact: primaryContactSummary,
        employees_created: createdEmployees,
        accounts_created: createdAccounts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[onboard-customer] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to onboard customer",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
