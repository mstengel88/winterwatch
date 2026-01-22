import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  return <div className="p-6">Finishing sign-in…</div>;
}
