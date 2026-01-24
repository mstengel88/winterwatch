// IMPORTANT: Use the same Supabase client instance as the rest of the app.
// If we exchange the OAuth code with a different client, the session may be
// stored under a different storage key and AuthContext won't see it.
import { supabase } from "@/integrations/supabase/client";

const CALLBACK_PREFIX = "winterwatch://auth/callback";

function extractParamsFromUrl(urlString: string) {
  // For custom URL schemes, the URL constructor may not handle hash fragments correctly.
  // Manually parse the URL to extract query and hash params.
  
  let queryString = "";
  let hashString = "";
  
  const hashIndex = urlString.indexOf("#");
  const queryIndex = urlString.indexOf("?");
  
  if (hashIndex !== -1) {
    hashString = urlString.slice(hashIndex + 1);
    // If there's a query before the hash
    if (queryIndex !== -1 && queryIndex < hashIndex) {
      queryString = urlString.slice(queryIndex + 1, hashIndex);
    }
  } else if (queryIndex !== -1) {
    queryString = urlString.slice(queryIndex + 1);
  }

  const queryParams = new URLSearchParams(queryString);
  const hashParams = new URLSearchParams(hashString);

  console.log("🔍 Parsed URL parts:", {
    hasHash: hashIndex !== -1,
    hasQuery: queryIndex !== -1,
    hashParamKeys: Array.from(hashParams.keys()),
    queryParamKeys: Array.from(queryParams.keys()),
  });

  const get = (key: string) => queryParams.get(key) ?? hashParams.get(key);

  return {
    get,
    queryParams,
    hashParams,
  };
}

async function handleAuthCallbackUrl(url: string) {
  const normalized = url.trim();
  
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

  const params = extractParamsFromUrl(normalized);

  const errorDesc = params.get("error_description") || params.get("error");
  if (errorDesc) {
    console.error("❌ OAuth callback error:", errorDesc);
    return false;
  }

  const code = params.get("code");
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  console.log("🔑 Token check:", {
    hasCode: !!code,
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
  });

  if (code) {
    console.log("🔁 Exchanging code for session...");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ exchangeCodeForSession error:", error);
      return false;
    }
  } else if (access_token && refresh_token) {
    console.log("🔁 Setting session from tokens...");
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.error("❌ setSession error:", error);
      return false;
    }
    console.log("✅ setSession result:", { userId: data.user?.id, hasSession: !!data.session });
  } else {
    console.warn("⚠️ No code or tokens found in callback URL; cannot establish session.");
    return false;
  }

  // Confirm session exists
  const { data, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error("❌ getSession error after callback:", sessionErr);
    return false;
  }

  console.log("✅ Final session check:", { userId: data.session?.user?.id ?? "NONE" });

  if (data.session) {
    // The onAuthStateChange listener in AuthContext should detect this session.
    // Give a small delay to ensure storage is flushed, then trigger a soft reload
    // that doesn't race with localStorage writes.
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Use history.replaceState + reload to avoid caching issues in Capacitor webview
    window.history.replaceState(null, "", "/");
    window.location.reload();
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
