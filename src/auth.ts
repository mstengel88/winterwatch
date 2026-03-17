import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

const REDIRECT_TO = "winterwatch://auth/callback";

async function openOAuthUrl(url: string) {
  // Native: use system browser (SFSafariViewController)
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, windowName: "_self" });
    return;
  }

  // Web: normal redirect
  window.location.assign(url);
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_TO,
      // optional but helps reliability on native:
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (data?.url) await openOAuthUrl(data.url);
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: REDIRECT_TO,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (data?.url) await openOAuthUrl(data.url);
}
