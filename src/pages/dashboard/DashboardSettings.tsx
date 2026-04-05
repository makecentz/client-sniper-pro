import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CreditCard, Mail, Check, Zap, ExternalLink, Building2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const STRIPE_PRICES = {
  pro: {
    price_id: "price_1TItjkIEsTwcnIOwOaiVh714",
    product_id: "prod_UHSfSAAJLpI9AT",
  },
  lead_pack: {
    price_id: "price_1TItluIEsTwcnIOwZ1FfAqiY",
    product_id: "prod_UHShRKsxBqMaMj",
  },
};

const DashboardSettings = () => {
  const { user, refreshSubscription } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Company settings state
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [company, setCompany] = useState({
    business_name: "",
    website_url: "",
    phone: "",
    email: "",
    website_dev_price: "",
    current_deal: "",
  });

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! Refreshing your account...");
      refreshSubscription();
    } else if (payment === "canceled") {
      toast.info("Payment was canceled.");
    }
  }, [searchParams, refreshSubscription]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("business_name, website_url, phone, email, website_dev_price, current_deal")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setCompany({
          business_name: data.business_name || "",
          website_url: data.website_url || "",
          phone: data.phone || "",
          email: data.email || "",
          website_dev_price: data.website_dev_price || "",
          current_deal: data.current_deal || "",
        });
      }
      setCompanyLoading(false);
    };
    load();
  }, [user?.id]);

  const handleSaveCompany = async () => {
    if (!user?.id) return;
    setCompanySaving(true);
    try {
      const { error } = await supabase
        .from("company_settings")
        .upsert({ user_id: user.id, ...company }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Company information saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleCheckout = async (priceId: string, label: string) => {
    setLoadingCheckout(label);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open portal");
    }
  };

  const isPro = user?.plan === "pro" || user?.subscribed;
  const updateField = (field: string, value: string) => setCompany((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, company info, and subscription</p>
      </div>

      {/* Company Information */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" /> Your Company Information
          </CardTitle>
          <CardDescription>
            This info is used to personalize AI-generated outreach letters, emails, and offers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {companyLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input placeholder="Your Web Design Co." value={company.business_name} onChange={(e) => updateField("business_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input placeholder="https://yoursite.com" value={company.website_url} onChange={(e) => updateField("website_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="(555) 123-4567" value={company.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input placeholder="hello@yoursite.com" value={company.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Website Development Price</Label>
                  <Input placeholder="$997" value={company.website_dev_price} onChange={(e) => updateField("website_dev_price", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Deal / Promotion</Label>
                <Textarea
                  placeholder="e.g. 20% off for new clients this month, free hosting for 3 months..."
                  value={company.current_deal}
                  onChange={(e) => updateField("current_deal", e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveCompany} disabled={companySaving}>
                <Save className="mr-2 h-4 w-4" />
                {companySaving ? "Saving..." : "Save Company Info"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-primary" /> Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads remaining</span>
              <span className="text-foreground">{user?.leads_remaining}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 ${isPro ? "border-primary/40" : ""}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" /> Current Plan
              {isPro && <Badge className="bg-primary text-primary-foreground">Pro</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{isPro ? "Pro" : "Free"}</Badge>
              <span className="text-sm text-muted-foreground">
                {isPro ? "50 searches/day • Unlimited leads" : "3 searches/day • 2 leads"}
              </span>
            </div>
            {isPro && user?.subscription_end && (
              <p className="text-xs text-muted-foreground">
                Renews {new Date(user.subscription_end).toLocaleDateString()}
              </p>
            )}
            {isPro && (
              <Button size="sm" variant="outline" onClick={handleManageSubscription}>
                <ExternalLink className="mr-2 h-4 w-4" /> Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade / Purchase section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`border-border/50 ${isPro ? "opacity-60" : "border-primary/30"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" /> Pro Plan
            </CardTitle>
            <CardDescription>$29/month — unlock the full platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {["50 searches per day", "Unlimited lead saves", "AI outreach & audits", "Priority support"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />{f}</li>
              ))}
            </ul>
            {isPro ? (
              <Badge variant="secondary">Your Plan</Badge>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleCheckout(STRIPE_PRICES.pro.price_id, "pro")}
                disabled={loadingCheckout === "pro"}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loadingCheckout === "pro" ? "Opening checkout..." : "Upgrade to Pro — $29/mo"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-green-500" /> Lead Pack
            </CardTitle>
            <CardDescription>$10 one-time — 15 additional leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {["15 extra lead credits", "Never expire", "Stack with any plan", "Instant activation"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500" />{f}</li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleCheckout(STRIPE_PRICES.lead_pack.price_id, "leads")}
              disabled={loadingCheckout === "leads"}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {loadingCheckout === "leads" ? "Opening checkout..." : "Buy 15 Leads — $10"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSettings;
