import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, CreditCard, Mail, Check, Zap, ExternalLink, Building2, Save, Sun, Moon, Link2, Unlink, KeyRound, Trash2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const STRIPE_PRICES = {
  pro: {
    price_id: "price_1TdpkqIEsTwcnIOwDssQsFXf",
    product_id: "prod_UHSfSAAJLpI9AT",
  },
  lead_pack: {
    price_id: "price_1TItluIEsTwcnIOwZ1FfAqiY",
    product_id: "prod_UHShRKsxBqMaMj",
  },
};

const DashboardSettings = () => {
  const { user, refreshSubscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Company settings state
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [company, setCompany] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    website_url: "",
    phone: "",
    email: "",
    website_dev_price: "",
    current_deal: "",
  });

  // Connected identities (sign-in methods)
  type Identity = { identity_id: string; provider: string; identity_data?: Record<string, any> };
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [identitiesLoading, setIdentitiesLoading] = useState(true);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  const loadIdentities = useCallback(async () => {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (!error && data?.identities) {
      setIdentities(data.identities as Identity[]);
    }
    setIdentitiesLoading(false);
  }, []);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  // If returning from Google OAuth link flow, refresh + toast
  useEffect(() => {
    const linked = searchParams.get("linked");
    if (linked === "google") {
      toast.success("Google account connected");
      loadIdentities();
    } else if (linked === "error") {
      toast.error(searchParams.get("error_description") || "Failed to connect Google");
    }
  }, [searchParams, loadIdentities]);

  const googleIdentity = identities.find((i) => i.provider === "google");
  const emailIdentity = identities.find((i) => i.provider === "email");

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard/settings?linked=google` },
      });
      if (error) throw error;
      // Browser will redirect to Google; nothing else to do.
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Google connection");
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return;
    if (identities.length <= 1) {
      toast.error("You must keep at least one sign-in method");
      return;
    }
    setUnlinkingGoogle(true);
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity as any);
      if (error) throw error;
      toast.success("Google account disconnected");
      await loadIdentities();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect Google");
    } finally {
      setUnlinkingGoogle(false);
    }
  };

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
        .select("first_name, last_name, business_name, website_url, phone, email, website_dev_price, current_deal")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setCompany({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
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
                  <Label>First Name</Label>
                  <Input placeholder="Jane" value={company.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input placeholder="Doe" value={company.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
                </div>
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

      {/* Connected Accounts */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-primary" /> Connected Accounts
          </CardTitle>
          <CardDescription>
            Link a Google account to sign in faster. You can connect or disconnect any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {identitiesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              {/* Email/password row */}
              <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email & Password</p>
                    <p className="text-xs text-muted-foreground">{emailIdentity?.identity_data?.email || user?.email}</p>
                  </div>
                </div>
                <Badge variant="secondary">Primary</Badge>
              </div>

              {/* Google row */}
              <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-foreground">Google</p>
                    <p className="text-xs text-muted-foreground">
                      {googleIdentity
                        ? googleIdentity.identity_data?.email || "Connected"
                        : "Sign in with your Google account"}
                    </p>
                  </div>
                </div>
                {googleIdentity ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={unlinkingGoogle}>
                        <Unlink className="mr-2 h-4 w-4" />
                        {unlinkingGoogle ? "Disconnecting..." : "Disconnect"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Google?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer be able to sign in with Google. You can still sign in with your email and password.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlinkGoogle}>Disconnect</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button size="sm" onClick={handleLinkGoogle} disabled={linkingGoogle}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {linkingGoogle ? "Connecting..." : "Connect Google"}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>



      {/* Appearance */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="gap-2"
            >
              <Sun className="h-4 w-4" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-4 w-4" /> Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade / Purchase section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`border-border/50 ${isPro ? "opacity-60" : "border-primary/30"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" /> Pro Plan
            </CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-2">
                <span className="text-foreground font-semibold">$25/mo</span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {["50 searches per day", "100 saved leads", "AI outreach & audits", "Priority support"].map((f) => (
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
                {loadingCheckout === "pro" ? "Opening checkout..." : "Upgrade to Pro — $25/mo"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-green-500" /> Lead Pack
            </CardTitle>
            <CardDescription>$10 one-time — +15 saved-lead slots (Pro only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {["+15 saved-lead slots", "Stacks with each purchase", "Slots never expire", "Instant activation"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500" />{f}</li>
              ))}
            </ul>
            {!isPro && (
              <p className="text-xs text-muted-foreground">Upgrade to Pro to unlock Lead Pack purchases.</p>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleCheckout(STRIPE_PRICES.lead_pack.price_id, "leads")}
              disabled={loadingCheckout === "leads" || !isPro}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {loadingCheckout === "leads" ? "Opening checkout..." : "Buy 15 Saved-Lead Slots — $10"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default DashboardSettings;
