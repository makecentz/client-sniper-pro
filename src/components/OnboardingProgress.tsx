import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, X, Rocket } from "lucide-react";

const STEPS: { key: string; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "business_name", label: "Business name" },
  { key: "website_url", label: "Your website URL" },
  { key: "phone", label: "Phone number" },
  { key: "email", label: "Business email" },
  { key: "website_dev_price", label: "Website starting price" },
];

const OnboardingProgress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(`onboarding_progress_dismissed_${user.id}`) === "1");
    supabase
      .from("company_settings")
      .select("first_name, last_name, business_name, website_url, phone, email, website_dev_price")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data ?? {});
        setLoading(false);
      });
  }, [user?.id]);

  if (loading || !settings) return null;

  const completedSteps = STEPS.filter((s) => (settings[s.key] ?? "").toString().trim() !== "");
  const completed = completedSteps.length;
  const total = STEPS.length;
  const pct = Math.round((completed / total) * 100);

  if (completed === total || dismissed) return null;

  const handleDismiss = () => {
    if (user) localStorage.setItem(`onboarding_progress_dismissed_${user.id}`, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Finish setting up your account</CardTitle>
            <CardDescription>
              {completed === 0
                ? "Add your business details so outreach and proposals are personalized for you."
                : `You've completed ${completed} of ${total} steps. Pick up where you left off.`}
            </CardDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Setup progress</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {STEPS.map((s) => {
            const done = (settings[s.key] ?? "").toString().trim() !== "";
            return (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={done ? "text-foreground" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={() => navigate("/onboarding")} size="sm">
            Resume setup
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/settings")}>
            Edit in Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingProgress;
