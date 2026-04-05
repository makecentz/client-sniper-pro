import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CreditCard, Mail, Check, Zap, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! Refreshing your account...");
      refreshSubscription();
    } else if (payment === "canceled") {
      toast.info("Payment was canceled.");
    }
  }, [searchParams, refreshSubscription]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and subscription</p>
      </div>

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
