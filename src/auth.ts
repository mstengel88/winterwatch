import { supabase } from "@/lib/supabase";


export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "winterwatch://auth/callback",
    },
  });

  if (error) throw error;
  if (data?.url) window.location.href = data.url;
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: "winterwatch://auth/callback",
    },
  });

  if (error) throw error;
  if (data?.url) window.location.href = data.url;
}

