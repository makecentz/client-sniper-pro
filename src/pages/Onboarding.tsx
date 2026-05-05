import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Rocket } from "lucide-react";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Skip business onboarding for affiliates and dismissed users.
  useEffect(() => {
    if (!user) return;
    if (
      localStorage.getItem(`onboarding_dismissed_${user.id}`) === "1" ||
      localStorage.getItem(`affiliate_signup_${user.id}`) === "1"
    ) {
      navigate("/dashboard", { replace: true });
      return;
    }
    // Backend fallback: if affiliate profile exists, treat as affiliate.
    supabase
      .from("affiliate_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          localStorage.setItem(`affiliate_signup_${user.id}`, "1");
          navigate("/dashboard/affiliate", { replace: true });
        }
      });
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    website_url: "",
    phone: "",
    email: user?.email ?? "",
    website_dev_price: "",
    current_deal: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("company_settings").upsert(
      { user_id: user.id, ...form },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
      return;
    }
    localStorage.setItem(`onboarding_dismissed_${user.id}`, "1");
    toast({ title: "Welcome aboard!", description: "Your company info has been saved." });
    navigate("/dashboard", { replace: true });
  };

  const handleSkip = async () => {
    if (!user) return;
    // Mark as dismissed locally so it never auto-opens again. User can complete in Settings.
    localStorage.setItem(`onboarding_dismissed_${user.id}`, "1");
    // Best-effort: insert empty row so server-side check also passes.
    await supabase.from("company_settings").upsert(
      { user_id: user.id },
      { onConflict: "user_id" }
    );
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
          <CardDescription>
            Tell us about your company so we can personalize outreach letters and proposals for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                name="business_name"
                placeholder="Acme Web Design"
                value={form.business_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Your Website URL</Label>
              <Input
                id="website_url"
                name="website_url"
                placeholder="https://yoursite.com"
                value={form.website_url}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_dev_price">Website Dev Starting Price</Label>
              <Input
                id="website_dev_price"
                name="website_dev_price"
                placeholder="$997"
                value={form.website_dev_price}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_deal">Current Deal / Promotion</Label>
              <Input
                id="current_deal"
                name="current_deal"
                placeholder="20% off first project"
                value={form.current_deal}
                onChange={handleChange}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Saving…" : "Get Started"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
