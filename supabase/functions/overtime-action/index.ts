import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionPayload {
  action: 'stay_on_shift' | 'stop_shift';
  time_clock_id: string;
  employee_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: ActionPayload = await req.json();
    const { action, time_clock_id, employee_id } = payload;

    // Validate input
    if (!action || !time_clock_id || !employee_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['stay_on_shift', 'stop_shift'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing overtime action: ${action} for time_clock ${time_clock_id}`);

    // Verify the employee belongs to the user
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name')
      .eq('id', employee_id)
      .maybeSingle();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is the employee or an admin
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'manager');
    const isOwner = employee.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'stay_on_shift') {
      // User wants to continue - just acknowledge
      console.log(`Employee ${employee.first_name} ${employee.last_name} chose to stay on shift`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'stay_on_shift',
          message: 'Continuing shift' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'stop_shift') {
      // Clock out the employee
      const now = new Date().toISOString();
      
      const { data: clockEntry, error: clockError } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: now,
        })
        .eq('id', time_clock_id)
        .is('clock_out_time', null)
        .select()
        .maybeSingle();

      if (clockError) {
        console.error('Error clocking out:', clockError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to clock out' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!clockEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'Clock entry not found or already clocked out' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Employee ${employee.first_name} ${employee.last_name} clocked out via notification`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'stop_shift',
          message: 'Successfully clocked out',
          clock_out_time: now
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in overtime-action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
