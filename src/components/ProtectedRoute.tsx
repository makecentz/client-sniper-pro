import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) { setOnboardingChecked(true); return; }
      const { data } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasSettings(!!data);
      setOnboardingChecked(true);
    };
    check();
  }, [user]);

  if (isLoading || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if no settings and trying to access dashboard
  if (!hasSettings && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
