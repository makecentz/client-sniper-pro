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
      if (hasSettings) { setOnboardingChecked(true); return; }
      setOnboardingChecked(false);
      const { data } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasSettings(!!data);
      setOnboardingChecked(true);
    };
    check();
  }, [user?.id]);

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

  // Redirect to onboarding only if no settings AND user hasn't dismissed it before.
  // Once dismissed (skipped or completed), it never auto-opens again — user can finish in Settings.
  const dismissed = user ? localStorage.getItem(`onboarding_dismissed_${user.id}`) === "1" : false;
  if (!hasSettings && !dismissed && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
