// IMPORTANT: Use the same Supabase client instance as the rest of the app.
// If we exchange the OAuth code with a different client, the session may be
// stored under a different storage key and AuthContext won't see it.
import { Capacitor } from "@capacitor/core";
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
    // The setSession call above triggers onAuthStateChange in AuthContext,
    // which will update the user/session state and cause the app to re-render.
    // We just need to navigate to the home page without a full reload.
    // Dispatch a custom event that the Auth page can listen for to trigger navigation.
    console.log("🏠 Session established, dispatching auth success event...");
    window.dispatchEvent(new CustomEvent("nativeAuthSuccess"));
    return true;
  }

  return false;
}

export async function initDeepLinkAuth() {
  if (!Capacitor.isNativePlatform()) return;

  // IMPORTANT (iOS 18.x stability):
  // We've observed WKWebView/WebProcess crashes happening immediately after
  // calling certain native-bridge APIs during very early startup.
  // In particular, App.getLaunchUrl() appears right before the crash in logs.
  //
  // Strategy:
  // 1) Always register the warm-start listener (covers the common OAuth return path).
  // 2) Avoid calling getLaunchUrl on iOS at startup.
  // 3) Defer any native calls slightly to allow the WebView to stabilize.

  const { App } = await import("@capacitor/app");

  // Warm start (and typical OAuth return)
  App.addListener("appUrlOpen", async ({ url }) => {
    try {
      if (!url) return;
      await handleAuthCallbackUrl(url);
    } catch (e) {
      console.error("❌ appUrlOpen handler failed:", e);
    }
  });

  // Cold start:
  // Only attempt to read launch URL on non-iOS platforms (Android), and defer.
  if (Capacitor.getPlatform() !== "ios") {
    setTimeout(async () => {
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          console.log("🚀 Launch URL:", launch.url);
          await handleAuthCallbackUrl(launch.url);
        }
      } catch (e) {
        console.error("❌ getLaunchUrl failed:", e);
      }
    }, 750);
  }
}
