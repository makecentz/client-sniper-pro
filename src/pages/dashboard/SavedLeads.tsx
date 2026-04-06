import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flame, AlertTriangle, MapPin, Phone, Globe, Mail, Download, Check, X, StickyNote, Trash2, ShieldOff, Smartphone, CalendarX, TrendingUp, Clock, Lightbulb, Users2, Loader2, Eye } from "lucide-react";
import { type Lead } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import LeadDetailModal from "@/components/LeadDetailModal";

type Filter = "all" | "new" | "contacted" | "followed_up" | "closed" | "lost";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "followed_up", label: "Followed Up" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

const SavedLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [modalLead, setModalLead] = useState<Lead | null>(null);

  const mapLead = (d: any): Lead => ({
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
    category: d.category || null,
    city: d.city || null,
    state: d.state || null,
    zip: d.zip || null,
    contact_name: d.contact_name || null,
    last_contacted_at: d.last_contacted_at || null,
    tags: d.tags || [],
  });

  const fetchLeads = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("priority_score", { ascending: false });
    if (error) {
      toast.error("Failed to load leads");
    } else {
      setLeads((data || []).map(mapLead));
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const filtered = leads.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const updateField = async (id: string, field: string, value: any) => {
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const updateNotes = async (id: string, notes: string) => {
    await updateField(id, "notes", notes);
    setEditingNotes(null);
    toast.success("Notes updated");
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead deleted");
  };

  const setFollowUp = async (id: string, days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const dateStr = date.toISOString().split("T")[0];
    await updateField(id, "follow_up_date", dateStr);
    toast.success(`Follow-up set for ${days} day${days > 1 ? "s" : ""}`);
  };

  const generateAI = async (leadId: string, type: "why_this_lead" | "competitor_insight") => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    setAiLoadingId(leadId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { type, lead },
      });
      if (error || data?.error) {
        toast.error(data?.error || "AI generation failed");
        return;
      }
      const field = type === "why_this_lead" ? "ai_insight" : "competitor_insight";
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, [field]: data.content } : l));
      toast.success(type === "why_this_lead" ? "AI insight generated" : "Competitor insight generated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAiLoadingId(null);
    }
  };

  const exportCSV = () => {
    const header = "Business Name,Phone,Email,Address,Website,Score,Priority,Status,Issues,Notes\n";
    const rows = leads
      .map((l) =>
        `"${l.business_name}","${l.phone}","${l.email || ""}","${l.address}","${l.website || ""}","${l.score}","${l.priority_label}","${l.status}","${(l.website_issues || []).join("; ")}","${l.notes}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads saved</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...STATUS_OPTIONS.map(s => s.value)] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "secondary"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATUS_OPTIONS.find(s => s.value === f)?.label || f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((lead) => (
          <Card key={lead.id} className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setModalLead(lead)}>
            <CardContent className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between" onClick={() => setModalLead(lead)}>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{lead.business_name}</span>
                    {/* Priority badge */}
                    {lead.priority_score > 0 && (
                      <Badge variant="outline" className={`text-xs ${
                        lead.priority_label === "high" ? "text-hot border-hot/30" :
                        lead.priority_label === "medium" ? "text-warning border-warning/30" :
                        "text-muted-foreground border-border"
                      }`}>
                        <TrendingUp className="mr-1 h-3 w-3" /> {lead.priority_score}
                      </Badge>
                    )}
                    {lead.score === "hot" ? (
                      <Badge className="bg-hot/10 text-hot border-hot/20"><Flame className="mr-1 h-3 w-3" /> Hot</Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="mr-1 h-3 w-3" /> Upgrade</Badge>
                    )}
                    {lead.follow_up_date && (
                      <Badge variant="outline" className="text-xs text-warning border-warning/30">
                        <Clock className="mr-1 h-3 w-3" /> Follow-up: {lead.follow_up_date}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.address}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>}
                    {lead.website && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {lead.website}</span>}
                  </div>

                  {/* Website status badges */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {!lead.has_website && (
                      <Badge variant="destructive" className="text-xs"><Globe className="mr-1 h-3 w-3" /> No Website</Badge>
                    )}
                    {lead.has_website && !lead.no_ssl && !lead.website_error && !lead.not_mobile_friendly && !lead.outdated_copyright && (
                      <Badge variant="outline" className="text-success border-success/30 text-xs"><Check className="mr-1 h-3 w-3" /> Website OK</Badge>
                    )}
                    {lead.no_ssl && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-xs"><ShieldOff className="mr-1 h-3 w-3" /> No SSL</Badge>
                    )}
                    {lead.website_error && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-xs"><AlertTriangle className="mr-1 h-3 w-3" /> Site Error</Badge>
                    )}
                    {lead.not_mobile_friendly && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-xs"><Smartphone className="mr-1 h-3 w-3" /> Not Mobile Friendly</Badge>
                    )}
                    {lead.outdated_copyright && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-xs"><CalendarX className="mr-1 h-3 w-3" /> Outdated Copyright</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* View button */}
                  <Button variant="ghost" size="sm" onClick={() => setModalLead(lead)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* Status dropdown */}
                  <Select value={lead.status} onValueChange={(v) => updateField(lead.id, "status", v)}>
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Follow-up */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm"><Clock className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Set follow-up</p>
                      {[1, 2, 3].map((d) => (
                        <Button key={d} variant="ghost" size="sm" className="w-full justify-start" onClick={() => setFollowUp(lead.id, d)}>
                          {d} day{d > 1 ? "s" : ""}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(editingNotes === lead.id ? null : lead.id)}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLead(lead.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* AI Insight & Competitor buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAI(lead.id, "why_this_lead")}
                  disabled={aiLoadingId === lead.id}
                >
                  {aiLoadingId === lead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Lightbulb className="mr-1 h-3 w-3" />}
                  {lead.ai_insight ? "Refresh Insight" : "Why This Lead?"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAI(lead.id, "competitor_insight")}
                  disabled={aiLoadingId === lead.id}
                >
                  {aiLoadingId === lead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Users2 className="mr-1 h-3 w-3" />}
                  {lead.competitor_insight ? "Refresh Competitors" : "Find Competitors"}
                </Button>
              </div>

              {/* AI Insight display */}
              {lead.ai_insight && (
                <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-sm">
                  <span className="font-medium text-primary flex items-center gap-1 mb-1"><Lightbulb className="h-3.5 w-3.5" /> Why This Lead</span>
                  <div className="text-muted-foreground whitespace-pre-line">{lead.ai_insight}</div>
                </div>
              )}

              {/* Competitor insight display */}
              {lead.competitor_insight && (
                <div className="rounded-md bg-warning/5 border border-warning/10 p-3 text-sm">
                  <span className="font-medium text-warning flex items-center gap-1 mb-1"><Users2 className="h-3.5 w-3.5" /> Competitor Insight</span>
                  <div className="text-muted-foreground whitespace-pre-line">{lead.competitor_insight}</div>
                </div>
              )}

              {lead.ai_audit && (
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">AI Audit:</span> {lead.ai_audit}
                </div>
              )}

              {lead.screenshot_url && (
                <div className="rounded-md overflow-hidden border border-border/30">
                  <img src={lead.screenshot_url} alt={`${lead.business_name} website`} className="w-full h-40 object-cover object-top" />
                </div>
              )}

              {lead.notes && editingNotes !== lead.id && (
                <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Notes:</span> {lead.notes}</div>
              )}

              {editingNotes === lead.id && (
                <div className="space-y-2">
                  <Textarea defaultValue={lead.notes} placeholder="Add notes..." id={`notes-${lead.id}`} />
                  <Button size="sm" onClick={() => {
                    const el = document.getElementById(`notes-${lead.id}`) as HTMLTextAreaElement;
                    updateNotes(lead.id, el.value);
                  }}>Save Notes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No leads found</div>
        )}
      </div>
    </div>
  );
};

export default SavedLeads;
