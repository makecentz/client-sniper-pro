import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Row { user_id: string; email: string; referral_code: string; clicks: number; referrals: number; conversions: number; total_earned: number; pending_balance: number }
interface PayoutRow { id: string; affiliate_user_id: string; email: string; amount: number; status: string; requested_at: string }

export const AdminAffiliates = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [rate, setRate] = useState("30");
  const [savingRate, setSavingRate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [linksRes, refsRes, comRes, paysRes, profRes, rateRes] = await Promise.all([
      supabase.from("affiliate_links").select("*"),
      supabase.from("affiliate_referrals").select("*"),
      supabase.from("affiliate_commissions").select("*"),
      supabase.from("affiliate_payouts").select("*").order("requested_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("admin_settings").select("value").eq("key", "affiliate_commission_rate").maybeSingle(),
    ]);

    if (rateRes.data?.value) setRate(rateRes.data.value);

    const profMap = new Map<string, string>();
    (profRes.data || []).forEach((p) => profMap.set(p.user_id, p.display_name || p.user_id.slice(0, 8)));

    const links = linksRes.data || [];
    const refs = refsRes.data || [];
    const coms = comRes.data || [];
    const pays = paysRes.data || [];

    const built: Row[] = links.map((l) => {
      const uRefs = refs.filter((r) => r.affiliate_user_id === l.user_id);
      const uCom = coms.filter((c) => c.affiliate_user_id === l.user_id && c.status !== "rejected");
      const uPaidOut = pays.filter((p) => p.affiliate_user_id === l.user_id && p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
      const uPending = pays.filter((p) => p.affiliate_user_id === l.user_id && p.status === "requested").reduce((s, p) => s + Number(p.amount), 0);
      const earned = uCom.reduce((s, c) => s + Number(c.amount), 0);
      return {
        user_id: l.user_id,
        email: profMap.get(l.user_id) || l.user_id.slice(0, 8),
        referral_code: l.referral_code,
        clicks: l.clicks,
        referrals: uRefs.length,
        conversions: uRefs.filter((r) => r.converted_to_pro).length,
        total_earned: earned,
        pending_balance: +(earned - uPaidOut - uPending).toFixed(2),
      };
    });
    setRows(built);

    setPayouts(pays.map((p) => ({
      id: p.id,
      affiliate_user_id: p.affiliate_user_id,
      email: profMap.get(p.affiliate_user_id) || p.affiliate_user_id.slice(0, 8),
      amount: Number(p.amount),
      status: p.status,
      requested_at: p.requested_at,
    })));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRate = async () => {
    setSavingRate(true);
    const { data: existing } = await supabase.from("admin_settings").select("id").eq("key", "affiliate_commission_rate").maybeSingle();
    const { error } = existing
      ? await supabase.from("admin_settings").update({ value: rate }).eq("key", "affiliate_commission_rate")
      : await supabase.from("admin_settings").insert({ key: "affiliate_commission_rate", value: rate });
    if (error) toast.error("Failed to save rate"); else toast.success(`Commission rate set to ${rate}%`);
    setSavingRate(false);
  };

  const updatePayout = async (id: string, status: "paid" | "rejected") => {
    const updates: any = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    const { error } = await supabase.from("affiliate_payouts").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }

    // If paid, mark related commissions paid; if rejected, mark them rejected
    const payout = payouts.find((p) => p.id === id);
    if (payout) {
      const newStatus = status === "paid" ? "paid" : "pending"; // unchanged on rejection
      if (status === "paid") {
        await supabase.from("affiliate_commissions")
          .update({ status: "paid" })
          .eq("affiliate_user_id", payout.affiliate_user_id)
          .in("status", ["pending", "approved"]);
      }
    }
    toast.success(`Payout ${status}`);
    load();
  };

  if (loading) return <Card><CardContent className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;

  const requested = payouts.filter((p) => p.status === "requested");

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /><CardTitle>Affiliates</CardTitle></div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Commission rate (%)</p>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" />
          </div>
          <Button onClick={saveRate} disabled={savingRate}>{savingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Payout requests ({requested.length})</h3>
          {requested.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Affiliate</TableHead><TableHead>Amount</TableHead><TableHead>Requested</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {requested.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>${p.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => updatePayout(p.id, "paid")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updatePayout(p.id, "rejected")}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">All affiliates ({rows.length})</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Email</TableHead><TableHead>Code</TableHead><TableHead>Clicks</TableHead>
              <TableHead>Refs</TableHead><TableHead>Conv.</TableHead><TableHead>Earned</TableHead><TableHead>Balance</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell className="font-mono text-xs">{r.referral_code}</TableCell>
                  <TableCell>{r.clicks}</TableCell>
                  <TableCell>{r.referrals}</TableCell>
                  <TableCell><Badge variant={r.conversions > 0 ? "default" : "secondary"}>{r.conversions}</Badge></TableCell>
                  <TableCell>${r.total_earned.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">${r.pending_balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
