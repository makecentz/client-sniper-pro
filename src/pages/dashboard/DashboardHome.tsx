import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Users, Phone, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { type Lead } from "@/lib/mock-data";

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("priority_score", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLeads(data.map((d) => ({
            ...d,
            phone: d.phone || "",
            address: d.address || "",
            score: (d.score as "hot" | "needs_upgrade") || "needs_upgrade",
            notes: d.notes || "",
            email: d.email || null,
            has_website: d.has_website ?? false,
            website_error: d.website_error ?? false,
            no_ssl: d.no_ssl ?? false,
            not_mobile_friendly: d.not_mobile_friendly ?? false,
            outdated_copyright: d.outdated_copyright ?? false,
            website_issues: d.website_issues || null,
            priority_score: d.priority_score ?? 0,
            priority_label: d.priority_label ?? "low",
            ai_insight: d.ai_insight || null,
            status: d.status || "new",
            follow_up_date: d.follow_up_date || null,
            competitor_insight: d.competitor_insight || null,
          })));
        }
        setLoading(false);
      });
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const topLeads = leads.slice(0, 5);
  const followUps = leads.filter((l) => l.follow_up_date && l.follow_up_date <= today);
  const totalLeads = leads.length;
  const contactedCount = leads.filter((l) => l.contacted || l.status === "contacted").length;
  const newCount = leads.filter((l) => l.status === "new").length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your lead generation overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Phone className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contactedCount}</p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-hot/10 p-2"><Flame className="h-5 w-5 text-hot" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{newCount}</p>
              <p className="text-xs text-muted-foreground">New Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2"><Clock className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{followUps.length}</p>
              <p className="text-xs text-muted-foreground">Follow-Ups Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up reminders */}
      {followUps.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" /> Follow-Up Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-md bg-background/50 p-3">
                <div>
                  <span className="font-medium text-foreground">{lead.business_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">Due: {lead.follow_up_date}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/leads")}>
                  View <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top leads */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-hot" /> 🔥 Top Leads Today
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard/leads")}>
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {topLeads.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              No leads yet. <Button variant="link" className="p-0" onClick={() => navigate("/dashboard/search")}>Search for businesses</Button>
            </div>
          )}
          {topLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between rounded-md border border-border/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full bg-primary/10 h-8 w-8 text-xs font-bold text-primary">
                  {lead.priority_score}
                </div>
                <div>
                  <span className="font-medium text-foreground">{lead.business_name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-xs ${
                      lead.priority_label === "high" ? "text-hot border-hot/30" :
                      lead.priority_label === "medium" ? "text-warning border-warning/30" :
                      "text-muted-foreground border-border"
                    }`}>
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {lead.priority_label === "high" ? "High Priority" :
                       lead.priority_label === "medium" ? "Medium" : "Low"}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{lead.status}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard/ai-tools")}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
