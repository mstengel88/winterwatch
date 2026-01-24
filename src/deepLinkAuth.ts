import { supabase } from "@/lib/supabase";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

async function handleAuthCallbackUrl(url: string) {
  if (!url.startsWith(CALLBACK_PREFIX)) return false;

  console.log("✅ DEEPLINK AUTH URL:", url);

  // Close OAuth browser if open (native only)
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // ignore
  }

  const u = new URL(url);

  const errorDesc =
    u.searchParams.get("error_description") || u.searchParams.get("error");
  if (errorDesc) {
    console.error("❌ OAuth callback error:", errorDesc);
    return false;
  }

  const code = u.searchParams.get("code");

  // If there's no code, nothing to exchange.
  // (Some providers use token-in-url on web, but native/Supabase+Apple should be PKCE with code.)
  if (!code) {
    console.warn("⚠️ No code found in callback URL; skipping exchange.");
    return false;
  }

  console.log("🔁 Exchanging code for session...");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("❌ exchangeCodeForSession error:", error);
    return false;
  }

  // Confirm session exists
  const { data, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error("❌ getSession error after callback:", sessionErr);
    return false;
  }

  console.log("✅ Session user:", data.session?.user?.id ?? "NONE");

  if (data.session) {
    window.location.replace("/");
    return true;
  }

  return false;
}

export async function initDeepLinkAuth() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const { App } = await import("@capacitor/app");

  // Cold start
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      console.log("🚀 Launch URL:", launch.url);
      await handleAuthCallbackUrl(launch.url);
    }
  } catch (e) {
    console.error("❌ getLaunchUrl failed:", e);
  }

  // Warm start
  App.addListener("appUrlOpen", async ({ url }) => {
    try {
      if (!url) return;
      await handleAuthCallbackUrl(url);
    } catch (e) {
      console.error("❌ appUrlOpen handler failed:", e);
    }
  });
}
