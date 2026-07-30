import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const getParam = (key: string) => queryParams.get(key) ?? hashParams.get(key);

      const code = getParam("code");
      const accessToken = getParam("access_token");
      const refreshToken = getParam("refresh_token");
      const tokenHash = getParam("token_hash");
      const type = getParam("type");
      const errorDescription = getParam("error_description") ?? getParam("error");

      if (errorDescription) {
        console.error("Auth callback error:", errorDescription);
        navigate("/auth", { replace: true });
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
          });
          if (error) {
            throw error;
          }
        }
      } catch (error) {
        console.error("Failed to complete auth callback:", error);
        navigate("/auth", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth callback session lookup failed:", error);
        navigate("/auth", { replace: true });
        return;
      }

      navigate(data.session ? "/app" : "/auth", { replace: true });
    };

    run();
  }, [navigate]);

  return <div style={{ padding: 16 }}>Signing you in…</div>;
}
