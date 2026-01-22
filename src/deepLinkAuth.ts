import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

export function initDeepLinkAuth() {
  CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    } catch (e) {
      console.error("Deep link parse error:", e);
    }
  });
}
