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

  // Skip business onboarding for affiliates only. Free users MUST complete onboarding.
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(`affiliate_signup_${user.id}`) === "1") {
      navigate("/dashboard/affiliate", { replace: true });
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
  const [prefilling, setPrefilling] = useState(true);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    website_url: "",
    phone: "",
    email: user?.email ?? "",
    website_dev_price: "",
    current_deal: "",
  });

  // Prefill from existing company_settings so users can resume where they left off.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("company_settings")
      .select("first_name, last_name, business_name, website_url, phone, email, website_dev_price, current_deal")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm((prev) => ({
            first_name: data.first_name ?? prev.first_name,
            last_name: data.last_name ?? prev.last_name,
            business_name: data.business_name ?? prev.business_name,
            website_url: data.website_url ?? prev.website_url,
            phone: data.phone ?? prev.phone,
            email: data.email ?? prev.email,
            website_dev_price: data.website_dev_price ?? prev.website_dev_price,
            current_deal: data.current_deal ?? prev.current_deal,
          }));
        }
        setPrefilling(false);
      });
  }, [user?.id]);

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
    toast({ title: "Welcome aboard!", description: "Your company info has been saved." });
    navigate("/dashboard", { replace: true });
  };

  const handleSkip = async () => {
    if (!user) return;
    await supabase.from("company_settings").upsert(
      { user_id: user.id, email: user.email },
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
            You can save what you have and finish the rest later — your progress is kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                placeholder="Acme Web Design (optional)"
                value={form.business_name}
                onChange={handleChange}
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
            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Get Started"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSkip}
                disabled={loading}
              >
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
