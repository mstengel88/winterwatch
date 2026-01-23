import { App as capacitorApp } from "@capacitor/app";
import { supabase } from "./lib/supabase";

export function initDeepLinkAuth() {
  capacitorApp.addListener("appUrlOpen", async ({ url }) => {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  });
}

