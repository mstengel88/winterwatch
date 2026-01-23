import { supabase } from "@/lib/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL is required.");
if (!supabaseKey) throw new Error("VITE_SUPABASE_ANON_KEY is required.");

export const supabase = createClient(supabaseUrl, supabaseKey);
