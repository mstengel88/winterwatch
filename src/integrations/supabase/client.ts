import { createClient } from "@supabase/supabase-js";
import {
  resolveRuntimeValue,
  winterWatchRuntimeConfig,
} from "@/lib/runtimeConfig";
import type { Database } from "./types";

export const SUPABASE_URL = resolveRuntimeValue(
  winterWatchRuntimeConfig.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_URL,
);
export const SUPABASE_PUBLISHABLE_KEY = resolveRuntimeValue(
  winterWatchRuntimeConfig.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "WinterWatch requires VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
