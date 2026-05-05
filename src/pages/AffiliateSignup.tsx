import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Gift, Upload, AlertCircle, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { GoogleAuthButton, AuthDivider } from "@/components/GoogleAuthButton";
import { trackReferralClick, getReferralCookie } from "@/lib/affiliate";
import { US_STATES } from "@/lib/us-states";

const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20),
  address_line1: z.string().trim().min(1).max(200),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().length(2),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid US ZIP code"),
  payout_method: z.enum(["paypal", "bank", "check"]),
  payout_details: z.string().trim().min(3).max(500),
});

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "OTHER", name: "Other" },
];

const AffiliateSignup = () => {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || getReferralCookie();

  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) trackReferralClick(r);
  }, [searchParams]);

  // Account step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [accountSubmitted, setAccountSubmitted] = useState(false);

  // Profile step
  const [country, setCountry] = useState("US");
  const [profile, setProfile] = useState({
    first_name: "", last_name: "", phone: "",
    address_line1: "", address_line2: "",
    city: "", state: "", zip: "",
    payout_method: "paypal" as "paypal" | "bank" | "check",
    payout_details: "",
  });
  const [i9File, setI9File] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isUSA = country === "US";

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await signup(email, password);
      setAccountSubmitted(true);
      toast.success("Account created! Check your email to confirm.");
    } catch {
      toast.error("Signup failed");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please confirm your email and log in first.");
    if (!isUSA) return;

    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return toast.error(first || "Please fill in all required fields");
    }
    if (!i9File) return toast.error("Please upload your I-9 form");
    if (i9File.size > 5 * 1024 * 1024) return toast.error("File must be under 5 MB");

    setSubmitting(true);
    try {
      // Upload I-9
      const ext = i9File.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${user.id}/i9-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("affiliate-documents")
        .upload(path, i9File, { upsert: true, contentType: i9File.type });
      if (upErr) throw upErr;

      // Upsert profile
      const { error: pErr } = await supabase.from("affiliate_profiles").upsert(
        {
          user_id: user.id,
          email: user.email ?? email,
          country: "US",
          ...parsed.data,
          i9_file_path: path,
          i9_uploaded_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" }
      );
      if (pErr) throw pErr;

      // Create referral link
      try { await supabase.functions.invoke("affiliate-create-link"); } catch (_) {}

      // Skip business onboarding
      localStorage.setItem(`onboarding_dismissed_${user.id}`, "1");
      localStorage.setItem(`affiliate_signup_${user.id}`, "1");

      toast.success("Welcome to the affiliate program!");
      navigate("/dashboard/affiliate", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Show profile step once authenticated
  const showProfileStep = !!user;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl border-border/50">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-2 block">
            <img src={logo} alt="ClientHunter AI" className="h-12 w-auto" />
          </Link>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
            <Gift className="h-3.5 w-3.5 text-primary" /> Affiliate Sign-Up
          </div>
          <CardTitle className="mt-2 text-2xl">
            {showProfileStep ? "Tell us about you" : "Become an Affiliate"}
          </CardTitle>
          <CardDescription>
            {showProfileStep
              ? "We need this info to send your commission payouts."
              : "Refer Pro users and earn recurring commission. U.S. residents only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showProfileStep ? (
            // ---------- Step 1: Account ----------
            accountSubmitted ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation email to <strong className="text-foreground">{email}</strong>.
                  Click the link to activate your account, then log in to continue your affiliate setup.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">Go to Login</Button>
                </Link>
              </div>
            ) : (
              <>
                {refCode && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                    <Gift className="h-4 w-4 text-primary" />
                    <span>Referred by code <strong>{refCode}</strong></span>
                  </div>
                )}
                <GoogleAuthButton />
                <AuthDivider />
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Creating account…" : "Create Affiliate Account"}
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>{" "}
                  and you'll be brought back here to finish.
                </p>
              </>
            )
          ) : (
            // ---------- Step 2: Profile + I-9 ----------
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isUSA && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sorry — the ClientHunter affiliate program is currently only available to U.S. residents.
                    Please select United States to continue.
                  </AlertDescription>
                </Alert>
              )}

              {isUSA && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name" value={profile.first_name}
                      onChange={(v) => setProfile({ ...profile, first_name: v })} />
                    <Field label="Last Name" value={profile.last_name}
                      onChange={(v) => setProfile({ ...profile, last_name: v })} />
                  </div>
                  <Field label="Phone" value={profile.phone} type="tel"
                    onChange={(v) => setProfile({ ...profile, phone: v })} />
                  <Field label="Street Address" value={profile.address_line1}
                    onChange={(v) => setProfile({ ...profile, address_line1: v })} />
                  <Field label="Apt / Suite (optional)" value={profile.address_line2} required={false}
                    onChange={(v) => setProfile({ ...profile, address_line2: v })} />
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="City" value={profile.city}
                      onChange={(v) => setProfile({ ...profile, city: v })} />
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={profile.state} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(([code, name]) => (
                            <SelectItem key={code} value={code}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="ZIP" value={profile.zip}
                      onChange={(v) => setProfile({ ...profile, zip: v })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select
                      value={profile.payout_method}
                      onValueChange={(v: "paypal" | "bank" | "check") =>
                        setProfile({ ...profile, payout_method: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank">Bank Transfer (ACH)</SelectItem>
                        <SelectItem value="check">Mailed Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field
                    label={
                      profile.payout_method === "paypal" ? "PayPal Email" :
                      profile.payout_method === "bank" ? "Bank Account & Routing #" :
                      "Mailing Name (matches address above)"
                    }
                    value={profile.payout_details}
                    onChange={(v) => setProfile({ ...profile, payout_details: v })}
                  />

                  <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-4">
                    <Label className="flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Upload I-9 Form (required)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, or PNG. Max 5 MB. Required for U.S. tax compliance before payouts can be issued.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => setI9File(e.target.files?.[0] ?? null)}
                    />
                    {i9File && <p className="text-xs text-primary">Selected: {i9File.name}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Complete Affiliate Sign-Up"}
                  </Button>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({
  label, value, onChange, type = "text", required = true,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) => (
  <div className="space-y-2">
    <Label>{label}{required && " *"}</Label>
    <Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export default AffiliateSignup;
