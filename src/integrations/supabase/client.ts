import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://caegybyfdkmgjrygnavg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZWd5YnlmZGttZ2pyeWduYXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDE3ODgsImV4cCI6MjA4NDE3Nzc4OH0.Zuj1X59yETraE9nhyzYKUwSjmJZzGp1eKvtcqyr3D6o";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
