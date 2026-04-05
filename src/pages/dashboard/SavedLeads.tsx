import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Flame, AlertTriangle, MapPin, Phone, Globe, Download, Check, X, StickyNote } from "lucide-react";
import { mockLeads, type Lead } from "@/lib/mock-data";
import { toast } from "sonner";

type Filter = "all" | "contacted" | "not_contacted";

const SavedLeads = () => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const filtered = leads.filter((l) => {
    if (filter === "contacted") return l.contacted;
    if (filter === "not_contacted") return !l.contacted;
    return true;
  });

  const toggleContacted = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, contacted: !l.contacted } : l))
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes } : l))
    );
    setEditingNotes(null);
    toast.success("Notes updated");
  };

  const exportCSV = () => {
    const header = "Business Name,Phone,Address,Website,Score,Contacted,Notes\n";
    const rows = leads
      .map((l) =>
        `"${l.business_name}","${l.phone}","${l.address}","${l.website || ""}","${l.score}","${l.contacted}","${l.notes}"`
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

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "contacted", "not_contacted"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "secondary"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "contacted" ? "Contacted" : "Not Contacted"}
          </Button>
        ))}
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filtered.map((lead) => (
          <Card key={lead.id} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                    {lead.website && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {lead.website}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleContacted(lead.id)}>
                    {lead.contacted ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(editingNotes === lead.id ? null : lead.id)}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {lead.ai_audit && (
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">AI Audit:</span> {lead.ai_audit}
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
