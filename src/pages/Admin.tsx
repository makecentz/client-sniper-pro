import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye, Download, Settings, Video, Phone, UserPlus, Snowflake } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { UserDetailModal, AdminUserRow } from "@/components/admin/UserDetailModal";
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics";
import { SocialProofManager } from "@/components/admin/SocialProofManager";
import { AdminAffiliates } from "@/components/admin/AdminAffiliates";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

interface WebhookRow {
  id: string;
  source: string;
  event_type: string;
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [proPrice, setProPrice] = useState(49);
  const [proPriceInput, setProPriceInput] = useState("49");
  const [savingPrice, setSavingPrice] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState("");
  const [heroVideoInput, setHeroVideoInput] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [heroVideoOpacity, setHeroVideoOpacity] = useState(50);
  const [savingOpacity, setSavingOpacity] = useState(false);
  const [footerAddress, setFooterAddress] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [footerCompanyName, setFooterCompanyName] = useState("");
  const [savingFooter, setSavingFooter] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);

  const refetchUsers = async () => {
    const [usageRes, profilesRes, leadsPerUserRes, companyRes] = await Promise.all([
      supabase.from("usage_tracking").select("*"),
      supabase.from("profiles").select("user_id, display_name, created_at"),
      supabase.from("leads").select("user_id"),
      supabase.from("company_settings").select("*"),
    ]);
    const usageRows = usageRes.data || [];
    const profileMap = new Map<string, any>();
    (profilesRes.data || []).forEach((p) => profileMap.set(p.user_id, p));
    const leadsCountMap = new Map<string, number>();
    (leadsPerUserRes.data || []).forEach((l) => leadsCountMap.set(l.user_id, (leadsCountMap.get(l.user_id) || 0) + 1));
    const companyMap = new Map<string, any>();
    (companyRes.data || []).forEach((c) => companyMap.set(c.user_id, c));
    const merged: AdminUserRow[] = usageRows.map((u: any) => ({
      user_id: u.user_id, plan: u.plan, searches_today: u.searches_today, leads_remaining: u.leads_remaining,
      created_at: u.created_at, last_search_date: u.last_search_date,
      email: profileMap.get(u.user_id)?.display_name || u.user_id.slice(0, 8),
      leads_count: leadsCountMap.get(u.user_id) || 0,
      frozen: !!u.frozen,
      admin_message: u.admin_message ?? null,
      company: companyMap.get(u.user_id) ? {
        business_name: companyMap.get(u.user_id).business_name, website_url: companyMap.get(u.user_id).website_url,
        phone: companyMap.get(u.user_id).phone, email: companyMap.get(u.user_id).email,
        website_dev_price: companyMap.get(u.user_id).website_dev_price, current_deal: companyMap.get(u.user_id).current_deal,
      } : undefined,
    }));
    setUsers(merged);
  };

  const handleToggleFrozen = async (userId: string, frozen: boolean) => {
    setUpdating(userId);
    const { error } = await supabase.from("usage_tracking").update({ frozen }).eq("user_id", userId);
    if (error) toast.error("Failed to update frozen state");
    else { updateUserState(userId, (u) => ({ ...u, frozen })); toast.success(frozen ? "Account frozen" : "Account unfrozen"); }
    setUpdating(null);
  };

  const handleSaveMessage = async (userId: string, message: string) => {
    setUpdating(userId);
    const value = message.trim() || null;
    const { error } = await supabase.from("usage_tracking").update({ admin_message: value, admin_message_at: value ? new Date().toISOString() : null }).eq("user_id", userId);
    if (error) toast.error("Failed to save message");
    else { updateUserState(userId, (u) => ({ ...u, admin_message: value })); toast.success(value ? "Message sent" : "Message cleared"); }
    setUpdating(null);
  };

  const updateUserState = (userId: string, updater: (u: AdminUserRow) => AdminUserRow) => {
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? updater(u) : u)));
    setSelectedUser((prev) => (prev && prev.user_id === userId ? updater(prev) : prev));
  };

  const handlePlanChange = async (userId: string, newPlan: "free" | "pro") => {
    setUpdating(userId);
    const leadsRemaining = newPlan === "pro" ? 99999 : 2;
    const { error } = await supabase.from("usage_tracking").update({ plan: newPlan, leads_remaining: leadsRemaining }).eq("user_id", userId);
    if (error) { toast.error("Failed to update plan"); }
    else { updateUserState(userId, (u) => ({ ...u, plan: newPlan, leads_remaining: leadsRemaining })); toast.success(`Plan updated to ${newPlan}`); }
    setUpdating(null);
  };

  const handleLeadsChange = async (userId: string, newLeads: number) => {
    if (isNaN(newLeads) || newLeads < 0) return;
    const { error } = await supabase.from("usage_tracking").update({ leads_remaining: newLeads }).eq("user_id", userId);
    if (error) { toast.error("Failed to update leads"); }
    else { updateUserState(userId, (u) => ({ ...u, leads_remaining: newLeads })); toast.success(`Leads updated to ${newLeads}`); }
  };

  const handleResetSearches = async (userId: string) => {
    setUpdating(userId);
    const { error } = await supabase.from("usage_tracking").update({ searches_today: 0 }).eq("user_id", userId);
    if (error) { toast.error("Failed to reset searches"); }
    else { updateUserState(userId, (u) => ({ ...u, searches_today: 0 })); toast.success("Searches reset to 0"); }
    setUpdating(null);
  };

  const handleSaveProfile = async (userId: string, displayName: string) => {
    setUpdating(userId);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", userId);
    if (error) { toast.error("Failed to update profile"); }
    else { updateUserState(userId, (u) => ({ ...u, email: displayName })); toast.success("Profile updated"); }
    setUpdating(null);
  };

  const handleSaveCompany = async (userId: string, data: { business_name: string; website_url: string; phone: string; email: string; website_dev_price: string; current_deal: string }) => {
    setUpdating(userId);
    const { error } = await supabase.from("company_settings").upsert({
      user_id: userId,
      business_name: data.business_name || null,
      website_url: data.website_url || null,
      phone: data.phone || null,
      email: data.email || null,
      website_dev_price: data.website_dev_price || null,
      current_deal: data.current_deal || null,
    }, { onConflict: "user_id" });
    if (error) { toast.error("Failed to update company settings"); }
    else { updateUserState(userId, (u) => ({ ...u, company: { ...data, business_name: data.business_name || null, website_url: data.website_url || null, phone: data.phone || null, email: data.email || null, website_dev_price: data.website_dev_price || null, current_deal: data.current_deal || null } })); toast.success("Company settings saved"); }
    setUpdating(null);
  };

  const handleDeleteUserData = async (userId: string) => {
    setUpdating(userId);
    const results = await Promise.all([
      supabase.from("leads").delete().eq("user_id", userId),
      supabase.from("company_settings").delete().eq("user_id", userId),
      supabase.from("usage_tracking").delete().eq("user_id", userId),
    ]);
    const hasError = results.some((r) => r.error);
    if (hasError) { toast.error("Some data could not be deleted"); }
    else {
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setSelectedUser(null);
      toast.success("All user data deleted");
    }
    setUpdating(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [usageRes, webhookRes, leadsRes, profilesRes, leadsPerUserRes, companyRes, settingsRes, videoRes, opacityRes, footerRes] = await Promise.all([
        supabase.from("usage_tracking").select("*"),
        supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, display_name, created_at"),
        supabase.from("leads").select("user_id"),
        supabase.from("company_settings").select("*"),
        supabase.from("admin_settings").select("*").eq("key", "pro_price_monthly").maybeSingle(),
        supabase.from("admin_settings").select("*").eq("key", "hero_video_url").maybeSingle(),
        supabase.from("admin_settings").select("*").eq("key", "hero_video_opacity").maybeSingle(),
        supabase.from("admin_settings").select("key,value").in("key", ["footer_address", "footer_phone", "footer_email", "footer_company_name"]),
      ]);

      if (footerRes.data) {
        for (const row of footerRes.data) {
          if (row.key === "footer_address") setFooterAddress(row.value || "");
          if (row.key === "footer_phone") setFooterPhone(row.value || "");
          if (row.key === "footer_email") setFooterEmail(row.value || "");
          if (row.key === "footer_company_name") setFooterCompanyName(row.value || "");
        }
      }

      if (videoRes.data?.value) {
        setHeroVideoUrl(videoRes.data.value);
        setHeroVideoInput(videoRes.data.value);
      }

      if (opacityRes.data?.value) {
        const o = parseInt(opacityRes.data.value, 10);
        if (!isNaN(o)) setHeroVideoOpacity(Math.max(0, Math.min(100, o)));
      }

      if (settingsRes.data?.value) {
        const p = parseFloat(settingsRes.data.value);
        if (!isNaN(p)) { setProPrice(p); setProPriceInput(String(p)); }
      }

      const usageRows = usageRes.data || [];
      const profileRows = profilesRes.data || [];
      const leadsRows = leadsPerUserRes.data || [];
      const companyRows = companyRes.data || [];

      const profileMap = new Map<string, { display_name: string | null }>();
      profileRows.forEach((p) => profileMap.set(p.user_id, p));

      const leadsCountMap = new Map<string, number>();
      leadsRows.forEach((l) => leadsCountMap.set(l.user_id, (leadsCountMap.get(l.user_id) || 0) + 1));

      const companyMap = new Map<string, typeof companyRows[0]>();
      companyRows.forEach((c) => companyMap.set(c.user_id, c));

      const merged: AdminUserRow[] = usageRows.map((u) => ({
        user_id: u.user_id, plan: u.plan, searches_today: u.searches_today, leads_remaining: u.leads_remaining,
        created_at: u.created_at, last_search_date: u.last_search_date,
        email: profileMap.get(u.user_id)?.display_name || u.user_id.slice(0, 8),
        leads_count: leadsCountMap.get(u.user_id) || 0,
        company: companyMap.get(u.user_id) ? {
          business_name: companyMap.get(u.user_id)!.business_name, website_url: companyMap.get(u.user_id)!.website_url,
          phone: companyMap.get(u.user_id)!.phone, email: companyMap.get(u.user_id)!.email,
          website_dev_price: companyMap.get(u.user_id)!.website_dev_price, current_deal: companyMap.get(u.user_id)!.current_deal,
        } : undefined,
      }));

      const today = new Date().toISOString().slice(0, 10);
      setUsers(merged);
      setWebhooks((webhookRes.data || []) as WebhookRow[]);
      setTotalLeads(leadsRes.count || 0);
      setActiveToday(usageRows.filter((u) => u.last_search_date === today).length);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === "pro").length;
  const freeUsers = users.filter((u) => u.plan === "free").length;
  const totalSearches = users.reduce((sum, u) => sum + u.searches_today, 0);
  const filteredUsers = users.filter((u) => u.email.toLowerCase().includes(searchFilter.toLowerCase()));

  const handleExportCSV = () => {
    const headers = ["Email", "Plan", "Searches Today", "Leads Remaining", "Leads Saved", "Last Active", "Joined", "Business Name", "Website", "Phone", "Company Email", "Dev Price", "Current Deal"];
    const rows = users.map((u) => [
      u.email, u.plan, u.searches_today, u.leads_remaining, u.leads_count,
      u.last_search_date || "Never", new Date(u.created_at).toLocaleDateString(),
      u.company?.business_name || "", u.company?.website_url || "", u.company?.phone || "",
      u.company?.email || "", u.company?.website_dev_price || "", u.company?.current_deal || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        <AdminStatsCards totalUsers={totalUsers} proUsers={proUsers} freeUsers={freeUsers} totalLeads={totalLeads} activeToday={activeToday} totalSearches={totalSearches} />

        <RevenueAnalytics users={users} proPriceMonthly={proPrice} onPriceChange={async (newPrice) => {
          setSavingPrice(true);
          const { error } = await supabase.from("admin_settings").update({ value: String(newPrice) }).eq("key", "pro_price_monthly");
          if (error) { toast.error("Failed to save price"); }
          else { setProPrice(newPrice); setProPriceInput(String(newPrice)); toast.success(`Pro price updated to $${newPrice}/mo`); }
          setSavingPrice(false);
        }} proPriceInput={proPriceInput} onPriceInputChange={setProPriceInput} savingPrice={savingPrice} />

        {/* Hero Video Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle>Hero Video</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Set the background video URL for the landing page hero section. Leave empty to use the default video.
            </p>
            <div className="flex items-center gap-3">
              <Input
                placeholder="https://example.com/video.mp4"
                value={heroVideoInput}
                onChange={(e) => setHeroVideoInput(e.target.value)}
                className="max-w-lg"
              />
              <Button
                disabled={savingVideo}
                onClick={async () => {
                  setSavingVideo(true);
                  const value = heroVideoInput.trim();
                  if (heroVideoUrl) {
                    const { error } = await supabase.from("admin_settings").update({ value }).eq("key", "hero_video_url");
                    if (error) {
                      const { error: e2 } = await supabase.from("admin_settings").insert({ key: "hero_video_url", value });
                      if (e2) toast.error("Failed to save video URL");
                      else { setHeroVideoUrl(value); toast.success("Hero video URL saved"); }
                    } else { setHeroVideoUrl(value); toast.success("Hero video URL saved"); }
                  } else {
                    const { error } = await supabase.from("admin_settings").insert({ key: "hero_video_url", value });
                    if (error) toast.error("Failed to save video URL");
                    else { setHeroVideoUrl(value); toast.success("Hero video URL saved"); }
                  }
                  setSavingVideo(false);
                }}
              >
                {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            {heroVideoUrl && (
              <div className="mt-4 rounded-lg border border-border/50 overflow-hidden max-w-md relative bg-background">
                <video src={heroVideoUrl} className="w-full h-auto" muted autoPlay loop playsInline style={{ opacity: heroVideoOpacity / 100 }} />
              </div>
            )}

            <div className="mt-6 max-w-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Video Opacity</label>
                <span className="text-sm tabular-nums text-muted-foreground">{heroVideoOpacity}%</span>
              </div>
              <Slider
                value={[heroVideoOpacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setHeroVideoOpacity(v[0])}
              />
              <Button
                size="sm"
                disabled={savingOpacity}
                onClick={async () => {
                  setSavingOpacity(true);
                  const value = String(heroVideoOpacity);
                  const { data: existing } = await supabase
                    .from("admin_settings")
                    .select("id")
                    .eq("key", "hero_video_opacity")
                    .maybeSingle();
                  const { error } = existing
                    ? await supabase.from("admin_settings").update({ value }).eq("key", "hero_video_opacity")
                    : await supabase.from("admin_settings").insert({ key: "hero_video_opacity", value });
                  if (error) toast.error("Failed to save opacity");
                  else toast.success(`Opacity saved (${heroVideoOpacity}%)`);
                  setSavingOpacity(false);
                }}
              >
                {savingOpacity ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Opacity"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Contact Info */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <CardTitle>Footer Contact Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Contact details shown in the footer of the public landing page.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="footer-company">Company Name</Label>
                <Input
                  id="footer-company"
                  placeholder="EcomExperts LLC"
                  value={footerCompanyName}
                  onChange={(e) => setFooterCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer-phone">Phone</Label>
                <Input
                  id="footer-phone"
                  placeholder="(267) 652-1512"
                  value={footerPhone}
                  onChange={(e) => setFooterPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="footer-email">Email</Label>
                <Input
                  id="footer-email"
                  type="email"
                  placeholder="hello@example.com"
                  value={footerEmail}
                  onChange={(e) => setFooterEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="footer-address">Address (use new lines for multi-line)</Label>
                <Textarea
                  id="footer-address"
                  rows={3}
                  placeholder={"5429 Baltimore Ave\nPhiladelphia, PA 19143"}
                  value={footerAddress}
                  onChange={(e) => setFooterAddress(e.target.value)}
                />
              </div>
            </div>
            <Button
              disabled={savingFooter}
              onClick={async () => {
                setSavingFooter(true);
                const entries: Array<{ key: string; value: string }> = [
                  { key: "footer_address", value: footerAddress },
                  { key: "footer_phone", value: footerPhone },
                  { key: "footer_email", value: footerEmail },
                  { key: "footer_company_name", value: footerCompanyName },
                ];
                let hadError = false;
                for (const entry of entries) {
                  const { data: existing } = await supabase
                    .from("admin_settings")
                    .select("id")
                    .eq("key", entry.key)
                    .maybeSingle();
                  const { error } = existing
                    ? await supabase.from("admin_settings").update({ value: entry.value }).eq("key", entry.key)
                    : await supabase.from("admin_settings").insert({ key: entry.key, value: entry.value });
                  if (error) hadError = true;
                }
                if (hadError) toast.error("Failed to save some footer settings");
                else toast.success("Footer contact info saved");
                setSavingFooter(false);
              }}
            >
              {savingFooter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Footer Info"}
            </Button>
          </CardContent>
        </Card>

        <SocialProofManager />

        <AdminAffiliates />

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Users ({totalUsers})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search by email..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="max-w-xs" />
              <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead><TableHead>Plan</TableHead><TableHead>Searches Today</TableHead>
                  <TableHead>Leads Remaining</TableHead><TableHead>Leads Saved</TableHead><TableHead>Last Active</TableHead>
                  <TableHead>Joined</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell><Badge variant={u.plan === "pro" ? "default" : "secondary"} className="capitalize">{u.plan}</Badge></TableCell>
                    <TableCell>{u.searches_today}</TableCell>
                    <TableCell>{u.leads_remaining}</TableCell>
                    <TableCell>{u.leads_count}</TableCell>
                    <TableCell className="text-muted-foreground">{u.last_search_date || "Never"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedUser(u)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Recent Webhook Events</CardTitle></CardHeader>
          <CardContent>
            {webhooks.length === 0 ? <p className="text-sm text-muted-foreground">No webhook events yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Event</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell><Badge variant="outline" className="capitalize">{w.source}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{w.event_type}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(w.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailModal
        user={selectedUser} open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}
        onPlanChange={handlePlanChange} onLeadsChange={handleLeadsChange} onResetSearches={handleResetSearches}
        onSaveProfile={handleSaveProfile} onSaveCompany={handleSaveCompany} onDeleteUserData={handleDeleteUserData}
        updating={updating}
      />
    </div>
  );
};

export default Admin;
