import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // This reads the OAuth result from the URL and finalizes the session
      // (Supabase v2 can also use getSession, but detectSessionInUrl is safest here)
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/auth", { replace: true });
        return;
      }

      if (data.session) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    };

    run();
  }, [navigate]);

  return (
    <div style={{ padding: 16 }}>
      Signing you in…
    </div>
  );
}
