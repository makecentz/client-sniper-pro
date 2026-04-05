import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Search, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  plan: string;
  searches_today: number;
  leads_remaining: number;
  created_at: string;
  email?: string;
}

interface WebhookRow {
  id: string;
  source: string;
  event_type: string;
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, plan: newPlan, leads_remaining: leadsRemaining } : u
        )
      );
      toast.success(`Plan updated to ${newPlan}`);
    }
    setUpdating(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch all usage_tracking (admin RLS allows this)
      const [usageRes, webhookRes, leadsRes, profilesRes] = await Promise.all([
        supabase.from("usage_tracking").select("*"),
        supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, display_name, created_at"),
      ]);

      const usageRows = usageRes.data || [];
      const profileRows = profilesRes.data || [];

      // Build a map of user_id -> profile info
      const profileMap = new Map<string, { display_name: string | null; created_at: string }>();
      profileRows.forEach((p) => profileMap.set(p.user_id, p));

      // Merge usage with profile emails (display_name is set to email on signup)
      const merged: UserRow[] = usageRows.map((u) => ({
        user_id: u.user_id,
        plan: u.plan,
        searches_today: u.searches_today,
        leads_remaining: u.leads_remaining,
        created_at: u.created_at,
        email: profileMap.get(u.user_id)?.display_name || u.user_id.slice(0, 8),
      }));

      // Count users active today (searched today)
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
  const totalSearches = users.reduce((sum, u) => sum + u.searches_today, 0);

  const stats = [
    { label: "Total Users", value: totalUsers.toString(), icon: Users },
    { label: "Pro Users", value: proUsers.toString(), icon: DollarSign },
    { label: "Total Leads", value: totalLeads.toString(), icon: Search },
    { label: "Active Today", value: activeToday.toString(), icon: Activity },
  ];

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
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users */}
        <Card className="border-border/50">
          <CardHeader><CardTitle>Users ({totalUsers})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Searches Today</TableHead>
                  <TableHead>Leads Remaining</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.plan === "pro" ? "default" : "secondary"} className="capitalize">
                        {u.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.searches_today}</TableCell>
                    <TableCell>{u.leads_remaining}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
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
    </div>
  );
};

export default Admin;
