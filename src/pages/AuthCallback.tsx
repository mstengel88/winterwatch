import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // Give Supabase a moment to process hash params
      await new Promise((r) => setTimeout(r, 0));

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/auth", { replace: true });
        return;
      }

      navigate(data.session ? "/dashboard" : "/auth", { replace: true });
    };

    run();
  }, [navigate]);

  return <div style={{ padding: 16 }}>Signing you in…</div>;
}
