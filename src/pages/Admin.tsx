import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { UserDetailModal, AdminUserRow } from "@/components/admin/UserDetailModal";

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

  const handlePlanChange = async (userId: string, newPlan: "free" | "pro") => {
    setUpdating(userId);
    const leadsRemaining = newPlan === "pro" ? 99999 : 2;
    const { error } = await supabase
      .from("usage_tracking")
      .update({ plan: newPlan, leads_remaining: leadsRemaining })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update plan");
    } else {
      const updater = (u: AdminUserRow) =>
        u.user_id === userId ? { ...u, plan: newPlan, leads_remaining: leadsRemaining } : u;
      setUsers((prev) => prev.map(updater));
      setSelectedUser((prev) => prev && prev.user_id === userId ? updater(prev) : prev);
      toast.success(`Plan updated to ${newPlan}`);
    }
    setUpdating(null);
  };

  const handleLeadsChange = async (userId: string, newLeads: number) => {
    if (isNaN(newLeads) || newLeads < 0) return;
    const { error } = await supabase
      .from("usage_tracking")
      .update({ leads_remaining: newLeads })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update leads");
    } else {
      const updater = (u: AdminUserRow) =>
        u.user_id === userId ? { ...u, leads_remaining: newLeads } : u;
      setUsers((prev) => prev.map(updater));
      setSelectedUser((prev) => prev && prev.user_id === userId ? updater(prev) : prev);
      toast.success(`Leads updated to ${newLeads}`);
    }
  };

  const handleResetSearches = async (userId: string) => {
    setUpdating(userId);
    const { error } = await supabase
      .from("usage_tracking")
      .update({ searches_today: 0 })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to reset searches");
    } else {
      const updater = (u: AdminUserRow) =>
        u.user_id === userId ? { ...u, searches_today: 0 } : u;
      setUsers((prev) => prev.map(updater));
      setSelectedUser((prev) => prev && prev.user_id === userId ? updater(prev) : prev);
      toast.success("Searches reset to 0");
    }
    setUpdating(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [usageRes, webhookRes, leadsRes, profilesRes, leadsPerUserRes, companyRes] = await Promise.all([
        supabase.from("usage_tracking").select("*"),
        supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, display_name, created_at"),
        supabase.from("leads").select("user_id"),
        supabase.from("company_settings").select("*"),
      ]);

      const usageRows = usageRes.data || [];
      const profileRows = profilesRes.data || [];
      const leadsRows = leadsPerUserRes.data || [];
      const companyRows = companyRes.data || [];

      // Build maps
      const profileMap = new Map<string, { display_name: string | null }>();
      profileRows.forEach((p) => profileMap.set(p.user_id, p));

      const leadsCountMap = new Map<string, number>();
      leadsRows.forEach((l) => leadsCountMap.set(l.user_id, (leadsCountMap.get(l.user_id) || 0) + 1));

      const companyMap = new Map<string, typeof companyRows[0]>();
      companyRows.forEach((c) => companyMap.set(c.user_id, c));

      const merged: AdminUserRow[] = usageRows.map((u) => ({
        user_id: u.user_id,
        plan: u.plan,
        searches_today: u.searches_today,
        leads_remaining: u.leads_remaining,
        created_at: u.created_at,
        last_search_date: u.last_search_date,
        email: profileMap.get(u.user_id)?.display_name || u.user_id.slice(0, 8),
        leads_count: leadsCountMap.get(u.user_id) || 0,
        company: companyMap.get(u.user_id) ? {
          business_name: companyMap.get(u.user_id)!.business_name,
          website_url: companyMap.get(u.user_id)!.website_url,
          phone: companyMap.get(u.user_id)!.phone,
          email: companyMap.get(u.user_id)!.email,
          website_dev_price: companyMap.get(u.user_id)!.website_dev_price,
          current_deal: companyMap.get(u.user_id)!.current_deal,
        } : undefined,
      }));

      const today = new Date().toISOString().slice(0, 10);
      const active = usageRows.filter((u) => u.last_search_date === today).length;

      setUsers(merged);
      setWebhooks((webhookRes.data || []) as WebhookRow[]);
      setTotalLeads(leadsRes.count || 0);
      setActiveToday(active);
      setLoading(false);
    };

    fetchData();
  }, []);

  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === "pro").length;
  const freeUsers = users.filter((u) => u.plan === "free").length;
  const totalSearches = users.reduce((sum, u) => sum + u.searches_today, 0);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        <AdminStatsCards
          totalUsers={totalUsers}
          proUsers={proUsers}
          freeUsers={freeUsers}
          totalLeads={totalLeads}
          activeToday={activeToday}
          totalSearches={totalSearches}
        />

        {/* Users */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users ({totalUsers})</CardTitle>
              <Input
                placeholder="Search by email..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Searches Today</TableHead>
                  <TableHead>Leads Remaining</TableHead>
                  <TableHead>Leads Saved</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.plan === "pro" ? "default" : "secondary"} className="capitalize">{u.plan}</Badge>
                    </TableCell>
                    <TableCell>{u.searches_today}</TableCell>
                    <TableCell>{u.leads_remaining}</TableCell>
                    <TableCell>{u.leads_count}</TableCell>
                    <TableCell className="text-muted-foreground">{u.last_search_date || "Never"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUser(u)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Webhook Logs */}
        <Card className="border-border/50">
          <CardHeader><CardTitle>Recent Webhook Events</CardTitle></CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No webhook events yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{w.source}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{w.event_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailModal
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        onPlanChange={handlePlanChange}
        onLeadsChange={handleLeadsChange}
        onResetSearches={handleResetSearches}
        updating={updating}
      />
    </div>
  );
};

export default Admin;
