import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Snowflake } from "lucide-react";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) { setOnboardingChecked(true); return; }
      setOnboardingChecked(false);
      const [settingsRes, usageRes] = await Promise.all([
        supabase.from("company_settings").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("usage_tracking").select("frozen").eq("user_id", user.id).maybeSingle(),
      ]);
      setHasSettings(!!settingsRes.data);
      setFrozen(!!(usageRes.data as any)?.frozen);
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

  if (frozen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Snowflake className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Account frozen</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been temporarily frozen. Please contact support to restore access.
          </p>
          <Button variant="outline" onClick={() => logout()}>Log out</Button>
        </div>
      </div>
    );
  }

  if (!hasSettings && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
