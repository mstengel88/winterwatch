import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");

    // Check if the token is the service_role key (for Home Assistant polling)
    // Otherwise validate as a user JWT
    let supabase;
    if (token === serviceRoleKey) {
      // Service role: full access, used by Home Assistant
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      // User JWT: validate claims
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "summary";

    const responseData: Record<string, unknown> = {};

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    if (endpoint === "summary" || endpoint === "all") {
      // Active shifts (clocked in, not out)
      const { data: activeShifts } = await supabase
        .from("time_clock")
        .select(
          "id, employee_id, clock_in_time, employee:employees(first_name, last_name)"
        )
        .is("clock_out_time", null);

      // Today's shifts
      const { data: todayShifts } = await supabase
        .from("time_clock")
        .select("id, clock_in_time, clock_out_time")
        .gte("clock_in_time", todayISO);

      let totalHoursToday = 0;
      (todayShifts || []).forEach((s) => {
        const start = new Date(s.clock_in_time).getTime();
        const end = s.clock_out_time
          ? new Date(s.clock_out_time).getTime()
          : Date.now();
        totalHoursToday += (end - start) / (1000 * 60 * 60);
      });

      responseData.time_clock = {
        active_shifts: (activeShifts || []).length,
        active_employees: (activeShifts || []).map((s) => ({
          name: s.employee
            ? `${(s.employee as any).first_name} ${(s.employee as any).last_name}`
            : "Unknown",
          employee_id: s.employee_id,
          clock_in_time: s.clock_in_time,
          hours_elapsed: parseFloat(
            (
              (Date.now() - new Date(s.clock_in_time).getTime()) /
              (1000 * 60 * 60)
            ).toFixed(2)
          ),
        })),
        total_shifts_today: (todayShifts || []).length,
        total_hours_today: parseFloat(totalHoursToday.toFixed(2)),
      };
    }

    if (endpoint === "work_logs" || endpoint === "all") {
      const { data: plowLogs } = await supabase
        .from("work_logs")
        .select("id, status, service_type, billing_status")
        .gte("created_at", todayISO);

      const { data: shovelLogs } = await supabase
        .from("shovel_work_logs")
        .select("id, status, service_type, billing_status")
        .gte("created_at", todayISO);

      const allLogs = [...(plowLogs || []), ...(shovelLogs || [])];

      responseData.work_logs = {
        total_today: allLogs.length,
        plow_today: (plowLogs || []).length,
        shovel_today: (shovelLogs || []).length,
        in_progress: allLogs.filter((l) => l.status === "in_progress").length,
        completed: allLogs.filter((l) => l.status === "completed").length,
        pending: allLogs.filter((l) => l.status === "pending").length,
        current: allLogs.filter((l) => l.billing_status === "current").length,
        billable: allLogs.filter((l) => l.billing_status === "billable").length,
      };
    }

    if (endpoint === "summary") {
      const { count: plowCount } = await supabase
        .from("work_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO);

      const { count: shovelCount } = await supabase
        .from("shovel_work_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO);

      responseData.work_logs_today = (plowCount || 0) + (shovelCount || 0);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
