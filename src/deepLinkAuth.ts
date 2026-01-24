// IMPORTANT: Use the same Supabase client instance as the rest of the app.
// If we exchange the OAuth code with a different client, the session may be
// stored under a different storage key and AuthContext won't see it.
import { supabase } from "@/integrations/supabase/client";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

function normalizeUrlForMatch(url: string) {
  // iOS can occasionally uppercase the scheme or include a trailing slash.
  return url.trim();
}

function extractParams(url: URL) {
  // Some providers/flows may deliver params in the hash fragment.
  const query = url.searchParams;
  const hashParams = new URLSearchParams(url.hash?.startsWith("#") ? url.hash.slice(1) : url.hash);

  const get = (key: string) => query.get(key) ?? hashParams.get(key);

  return {
    get,
    raw: {
      query,
      hashParams,
    },
  };
}

async function handleAuthCallbackUrl(url: string) {
  const normalized = normalizeUrlForMatch(url);
  // Accept both exact prefix and a trailing slash variant.
  if (!(normalized.startsWith(CALLBACK_PREFIX) || normalized.startsWith(`${CALLBACK_PREFIX}/`))) {
    return false;
  }

  console.log("✅ DEEPLINK AUTH URL:", url);

  // Close OAuth browser if open (native only)
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // ignore
  }

  const u = new URL(normalized);
  const params = extractParams(u);

  const errorDesc = params.get("error_description") || params.get("error");
  if (errorDesc) {
    console.error("❌ OAuth callback error:", errorDesc);
    return false;
  }

  const code = params.get("code");

  if (code) {
    console.log("🔁 Exchanging code for session...");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ exchangeCodeForSession error:", error);
      return false;
    }
  } else {
    // Fallback: some flows may return tokens directly in the hash.
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      console.warn(
        "⚠️ No code or tokens found in callback URL; cannot establish session.",
        {
          hasQueryParams: Array.from(params.raw.query.keys()),
          hasHashParams: Array.from(params.raw.hashParams.keys()),
        },
      );
      return false;
    }

    console.log("🔁 Setting session from tokens...");
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.error("❌ setSession error:", error);
      return false;
    }
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
