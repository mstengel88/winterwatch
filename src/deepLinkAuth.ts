import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

async function handleAuthCallbackUrl(url: string) {
  if (!url.startsWith(CALLBACK_PREFIX)) return false;

  console.log("✅ DEEPLINK AUTH URL:", url);

  try {
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

  if (code) {
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

    // Force app to land on home and re-evaluate auth state cleanly
    if (data.session) {
      window.location.replace("/");
      return true;
    }
  }

  return false;
}

export async function initDeepLinkAuth() {
  if (!Capacitor.isNativePlatform()) return;

  // Cold start
  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) {
      console.log("🚀 Launch URL:", launch.url);
      await handleAuthCallbackUrl(launch.url);
    }
  } catch (e) {
    console.error("❌ getLaunchUrl failed:", e);
  }

  // Warm start
  CapApp.addListener("appUrlOpen", async ({ url }) => {
    try {
      if (!url) return;
      await handleAuthCallbackUrl(url);
    } catch (e) {
      console.error("❌ appUrlOpen handler failed:", e);
    }
  });
}
