import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Flame, AlertTriangle, MapPin, Phone, Globe, Mail, Download, Check, X, StickyNote, Trash2, ShieldOff, Smartphone, CalendarX } from "lucide-react";
import { type Lead } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Filter = "all" | "contacted" | "not_contacted";

const SavedLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load leads");
      console.error(error);
    } else {
      setLeads((data || []).map((d) => ({
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
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  const filtered = leads.filter((l) => {
    if (filter === "contacted") return l.contacted;
    if (filter === "not_contacted") return !l.contacted;
    return true;
  });

  const toggleContacted = async (id: string, current: boolean) => {
    const { error } = await supabase.from("leads").update({ contacted: !current }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, contacted: !current } : l));
  };

  const updateNotes = async (id: string, notes: string) => {
    const { error } = await supabase.from("leads").update({ notes }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, notes } : l));
    setEditingNotes(null);
    toast.success("Notes updated");
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead deleted");
  };

  const exportCSV = () => {
    const header = "Business Name,Phone,Email,Address,Website,Score,Issues,Contacted,Notes\n";
    const rows = leads
      .map((l) =>
        `"${l.business_name}","${l.phone}","${l.email || ""}","${l.address}","${l.website || ""}","${l.score}","${(l.website_issues || []).join("; ")}","${l.contacted}","${l.notes}"`
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

      <div className="flex gap-2">
        {(["all", "contacted", "not_contacted"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "secondary"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "contacted" ? "Contacted" : "Not Contacted"}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((lead) => (
          <Card key={lead.id} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{lead.business_name}</span>
                    {lead.score === "hot" ? (
                      <Badge className="bg-hot/10 text-hot border-hot/20"><Flame className="mr-1 h-3 w-3" /> Hot</Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="mr-1 h-3 w-3" /> Upgrade</Badge>
                    )}
                    {lead.contacted && (
                      <Badge variant="outline" className="text-success border-success/30"><Check className="mr-1 h-3 w-3" /> Contacted</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.address}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>}
                    {lead.website && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {lead.website}</span>}
                  </div>
                  {/* Website status & issue badges */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {!lead.has_website && (
                      <Badge variant="destructive" className="text-xs">
                        <Globe className="mr-1 h-3 w-3" /> No Website
                      </Badge>
                    )}
                    {lead.has_website && !lead.no_ssl && !lead.website_error && !lead.not_mobile_friendly && !lead.outdated_copyright && (
                      <Badge variant="outline" className="text-success border-success/30 text-xs">
                        <Check className="mr-1 h-3 w-3" /> Website OK
                      </Badge>
                    )}
                    {lead.no_ssl && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                        <ShieldOff className="mr-1 h-3 w-3" /> No SSL
                      </Badge>
                    )}
                    {lead.website_error && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Site Error
                      </Badge>
                    )}
                    {lead.not_mobile_friendly && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                        <Smartphone className="mr-1 h-3 w-3" /> Not Mobile Friendly
                      </Badge>
                    )}
                    {lead.outdated_copyright && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                        <CalendarX className="mr-1 h-3 w-3" /> Outdated Copyright
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleContacted(lead.id, lead.contacted)}>
                    {lead.contacted ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(editingNotes === lead.id ? null : lead.id)}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLead(lead.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

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
