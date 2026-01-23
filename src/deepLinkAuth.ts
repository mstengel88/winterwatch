import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

async function handleAuthCallbackUrl(url: string) {
  if (!url.startsWith(CALLBACK_PREFIX)) return;

  console.log("✅ DEEPLINK AUTH URL:", url);

  // Close the OAuth browser view (if still open)
  try {
    await Browser.close();
  } catch {
    // ignore
  }

  const u = new URL(url);

  const errorDesc =
    u.searchParams.get("error_description") || u.searchParams.get("error");
  if (errorDesc) {
    console.error("❌ OAuth error from callback:", errorDesc);
    return;
  }

  // PKCE flow: ?code=...
  const code = u.searchParams.get("code");
  if (code) {
    console.log("🔁 Exchanging code for session...");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ exchangeCodeForSession error:", error);
      return;
    }
    console.log("✅ Code exchanged; session should be stored.");
  } else {
    // Fallback: token-in-url flows
    console.log("🔁 getSessionFromUrl fallback...");
    const { error } = await supabase.auth.getSessionFromUrl({
      url,
      storeSession: true,
    });
    if (error) {
      console.error("❌ getSessionFromUrl error:", error);
      return;
    }
  }

  // Verify we actually have a session after exchange
  const { data, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error("❌ getSession error after callback:", sessionErr);
    return;
  }

  console.log("✅ Session after callback:", data.session?.user?.id ?? "NONE");
}

export async function initDeepLinkAuth() {
  if (!Capacitor.isNativePlatform()) return;

  // 1) Handle cold-start deep links (app fully closed)
  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) {
      console.log("🚀 Launch URL:", launch.url);
      await handleAuthCallbackUrl(launch.url);
    }
  } catch (e) {
    console.error("❌ getLaunchUrl failed:", e);
  }

  // 2) Handle warm-start deep links (app already running/backgrounded)
  CapApp.addListener("appUrlOpen", async ({ url }) => {
    try {
      if (!url) return;
      await handleAuthCallbackUrl(url);
    } catch (e) {
      console.error("❌ appUrlOpen handler failed:", e);
    }
  });
}
