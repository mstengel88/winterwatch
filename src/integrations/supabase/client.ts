// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env vars missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
