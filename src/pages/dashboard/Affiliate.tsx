import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Loader2, Users, MousePointerClick, TrendingUp, DollarSign, Wallet, Gift } from "lucide-react";
import { toast } from "sonner";

const MIN_PAYOUT = 50;

interface AffiliateLink { id: string; referral_code: string; clicks: number; created_at: string }
interface Referral { id: string; created_at: string; converted_to_pro: boolean; referred_user_id: string }
interface Commission { id: string; amount: number; status: string; created_at: string }
interface Payout { id: string; amount: number; status: string; requested_at: string; paid_at: string | null }

const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
};

const Affiliate = () => {
  const { user } = useAuth();
  const [link, setLink] = useState<AffiliateLink | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [referredEmails, setReferredEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    // Get/create link
    let { data: linkRow } = await supabase
      .from("affiliate_links").select("*").eq("user_id", user.id).maybeSingle();
    if (!linkRow) {
      const { data } = await supabase.functions.invoke("affiliate-create-link");
      linkRow = data?.link ?? null;
    }
    setLink(linkRow);

    const [refRes, comRes, payRes] = await Promise.all([
      supabase.from("affiliate_referrals").select("*").eq("affiliate_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("*").eq("affiliate_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").eq("affiliate_user_id", user.id).order("requested_at", { ascending: false }),
    ]);
    setReferrals(refRes.data || []);
    setCommissions((comRes.data as any) || []);
    setPayouts((payRes.data as any) || []);

    // Fetch referred users' display names from profiles
    const ids = (refRes.data || []).map((r) => r.referred_user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p) => { map[p.user_id] = p.display_name || ""; });
      setReferredEmails(map);
    }

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [user?.id]);

  const referralUrl = link ? `${window.location.origin}/?ref=${link.referral_code}` : "";

  const totalEarned = commissions.filter((c) => c.status !== "rejected").reduce((s, c) => s + Number(c.amount), 0);
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const requestedPending = payouts.filter((p) => p.status === "requested").reduce((s, p) => s + Number(p.amount), 0);
  const balance = +(totalEarned - paidOut - requestedPending).toFixed(2);
  const conversions = referrals.filter((r) => r.converted_to_pro).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied!");
  };

  const handleRequestPayout = async () => {
    if (!user || balance < MIN_PAYOUT) return;
    setRequesting(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_user_id: user.id,
      amount: balance,
      status: "requested",
    });
    if (error) toast.error(error.message);
    else { toast.success("Payout requested!"); loadAll(); }
    setRequesting(false);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /> Affiliate Program</h1>
        <p className="text-sm text-muted-foreground mt-1">Earn commission for every Pro user you refer.</p>
      </div>

      {/* Referral link */}
      <Card>
        <CardHeader><CardTitle className="text-base">Your Referral Link</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={referralUrl} className="font-mono text-sm" />
          <Button onClick={handleCopy}><Copy className="h-4 w-4 mr-2" />Copy</Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={MousePointerClick} label="Clicks" value={link?.clicks ?? 0} />
        <StatCard icon={Users} label="Referrals" value={referrals.length} />
        <StatCard icon={TrendingUp} label="Pro Conversions" value={conversions} />
        <StatCard icon={DollarSign} label="Total Earned" value={`$${totalEarned.toFixed(2)}`} />
        <StatCard icon={Wallet} label="Available Balance" value={`$${balance.toFixed(2)}`} highlight />
      </div>

      {/* Payout */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payouts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Available balance</p>
              <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Minimum payout: ${MIN_PAYOUT}</p>
            </div>
            <Button onClick={handleRequestPayout} disabled={balance < MIN_PAYOUT || requesting}>
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Payout"}
            </Button>
          </div>

          {payouts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Referrals */}
      <Card>
        <CardHeader><CardTitle className="text-base">Referrals</CardTitle></CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No referrals yet. Share your link!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{maskEmail(referredEmails[r.referred_user_id] || "")}</TableCell>
                    <TableCell>
                      {r.converted_to_pro
                        ? <Badge className="bg-primary">Upgraded to Pro</Badge>
                        : <Badge variant="secondary">Signed up</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) => (
  <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

export default Affiliate;
