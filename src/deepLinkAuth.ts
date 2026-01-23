import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

export function initDeepLinkAuth() {
  if (!Capacitor.isNativePlatform()) return;

  CapApp.addListener("appUrlOpen", async ({ url }) => {
    try {
      if (!url || !url.startsWith(CALLBACK_PREFIX)) return;

      // close the OAuth browser view
      try {
        await Browser.close();
      } catch {
        // ignore
      }

      const u = new URL(url);

      const errorDesc = u.searchParams.get("error_description");
      if (errorDesc) {
        console.error("OAuth error:", errorDesc);
        return;
      }

      // PKCE: ?code=...
      const code = u.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return;
      }

      // Fallback: token-in-url flows
      const { error } = await supabase.auth.getSessionFromUrl({
        url,
        storeSession: true,
      });
      if (error) throw error;
    } catch (e) {
      console.error("Deep link auth handling failed:", e);
    }
  });
}
