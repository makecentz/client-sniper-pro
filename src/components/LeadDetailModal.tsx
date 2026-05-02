import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Flame, AlertTriangle, MapPin, Phone, Globe, Mail, Check, ShieldOff, Smartphone,
  CalendarX, TrendingUp, Clock, Lightbulb, Users2, Copy, Trash2, Pencil, Plus,
  User, Tag, FileText, Video, PhoneCall, MessageCircle, Sparkles, Loader2, Search, Wand2,
  Star, MessageSquare, TrendingDown
} from "lucide-react";
import { Globe2, Lock, ExternalLink } from "lucide-react";
import { type Lead } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import OfferBuilderModal from "@/components/OfferBuilderModal";
import { Link } from "react-router-dom";

interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: (lead: Lead) => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "text-primary" },
  { value: "contacted", label: "Contacted", color: "text-success" },
  { value: "followed_up", label: "Followed Up", color: "text-warning" },
  { value: "closed", label: "Closed", color: "text-success" },
  { value: "lost", label: "Lost", color: "text-destructive" },
];

const LeadDetailModal = ({ lead, open, onOpenChange, onLeadUpdated }: LeadDetailModalProps) => {
  const { user } = useAuth();
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [scraping, setScraping] = useState(false);
  const [offerBuilderOpen, setOfferBuilderOpen] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  const [screenshotKey, setScreenshotKey] = useState(0);
  useEffect(() => {
    if (!lead || !open) return;
    setScreenshotError(false);
    setScreenshotKey((k) => k + 1);
    setEditForm({
      business_name: lead.business_name,
      phone: lead.phone,
      address: lead.address,
      website: lead.website,
      email: lead.email,
      category: lead.category,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      contact_name: lead.contact_name,
      tags: lead.tags || [],
    });
    setGeneratedContent("");
    fetchNotes();
    fetchRelatedContent();
  }, [lead, open]);

  const fetchNotes = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setNotes((data as LeadNote[]) || []);
  };

  const fetchRelatedContent = async () => {
    if (!lead) return;
    const [msgRes, offRes] = await Promise.all([
      supabase.from("messages").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
      supabase.from("offers").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
    ]);
    setMessages(msgRes.data || []);
    setOffers(offRes.data || []);
  };

  const updateStatus = async (newStatus: string) => {
    if (!lead) return;
    const updates: any = { status: newStatus };
    if (newStatus === "contacted") updates.last_contacted_at = new Date().toISOString();
    if (newStatus === "contacted") updates.contacted = true;
    const { error } = await supabase.from("leads").update(updates).eq("id", lead.id);
    if (error) { toast.error("Failed to update status"); return; }
    const updated = { ...lead, ...updates };
    onLeadUpdated(updated);
    toast.success(`Status updated to ${newStatus}`);
  };

  const saveDetails = async () => {
    if (!lead) return;
    setSaving(true);
    const { error } = await supabase.from("leads").update({
      business_name: editForm.business_name,
      phone: editForm.phone,
      address: editForm.address,
      website: editForm.website,
      email: editForm.email,
      category: editForm.category,
      city: editForm.city,
      state: editForm.state,
      zip: editForm.zip,
      contact_name: editForm.contact_name,
      tags: editForm.tags || [],
    }).eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    onLeadUpdated({ ...lead, ...editForm } as Lead);
    toast.success("Lead updated");
  };

  const addNote = async () => {
    if (!lead || !user || !newNote.trim()) return;
    setAddingNote(true);
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      user_id: user.id,
      content: newNote.trim(),
    });
    setAddingNote(false);
    if (error) { toast.error("Failed to add note"); return; }
    setNewNote("");
    fetchNotes();
    toast.success("Note added");
  };

  const updateNote = async (noteId: string) => {
    const { error } = await supabase.from("lead_notes").update({ content: editingNoteContent }).eq("id", noteId);
    if (error) { toast.error("Failed to update note"); return; }
    setEditingNoteId(null);
    fetchNotes();
    toast.success("Note updated");
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
    if (error) { toast.error("Failed to delete note"); return; }
    fetchNotes();
    toast.success("Note deleted");
  };

  const generateAI = async (type: string) => {
    if (!lead) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { type, lead: { ...lead, ...editForm } },
      });
      if (error || data?.error) { toast.error(data?.error || "Generation failed"); return; }
      setGeneratedContent(data.content);
      toast.success("Content generated!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const scrapeContacts = async () => {
    if (!lead) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-lead-contacts", {
        body: { lead_id: lead.id },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Scraping failed");
        return;
      }
      const updated = {
        ...lead,
        scraped_emails: data.scraped_emails || [],
        scraped_phones: data.scraped_phones || [],
        contact_scrape_status: data.status,
        contact_scraped_at: new Date().toISOString(),
        email: data.primary_email || lead.email,
        phone: data.primary_phone || lead.phone,
      };
      onLeadUpdated(updated);
      if (data.status === "success") toast.success("Contact info found!");
      else if (data.status === "partial") toast.success("Some contact info found");
      else toast("No contact info found on website");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setScraping(false);
    }
  };

  if (!lead) return null;

  const tagsStr = (editForm.tags || []).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.business_name}
            <Badge variant="outline" className={`text-xs capitalize ${
              lead.status === "closed" ? "text-success border-success/30" :
              lead.status === "lost" ? "text-destructive border-destructive/30" :
              lead.status === "contacted" ? "text-primary border-primary/30" :
              "text-muted-foreground border-border"
            }`}>
              {lead.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="ai">AI Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                {lead.phone && <div className="flex items-center justify-between group"><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}</p><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyContent(lead.phone!)}><Copy className="h-3 w-3" /></Button></div>}
                {lead.email && <div className="flex items-center justify-between group"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {lead.email}</p><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyContent(lead.email!)}><Copy className="h-3 w-3" /></Button></div>}
                {lead.address && <div className="flex items-center justify-between group"><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {lead.address}</p><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyContent(lead.address!)}><Copy className="h-3 w-3" /></Button></div>}
                {lead.website && <div className="flex items-center justify-between group"><p className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" className="text-primary hover:underline truncate">{lead.website}</a></p><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyContent(lead.website!)}><Copy className="h-3 w-3" /></Button></div>}
                {lead.contact_name && <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {lead.contact_name}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {lead.score === "hot" ? (
                    <Badge className="bg-hot/10 text-hot border-hot/20"><Flame className="mr-1 h-3 w-3" /> Hot</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="mr-1 h-3 w-3" /> Upgrade</Badge>
                  )}
                  {lead.priority_score > 0 && (
                    <Badge variant="outline" className={`text-xs ${
                      lead.priority_label === "high" ? "text-hot border-hot/30" :
                      lead.priority_label === "medium" ? "text-warning border-warning/30" :
                      "text-muted-foreground border-border"
                    }`}>
                      <TrendingUp className="mr-1 h-3 w-3" /> {lead.priority_score}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Created: {new Date(lead.created_at).toLocaleDateString()}</p>
                {lead.last_contacted_at && <p className="text-muted-foreground text-xs">Last contacted: {new Date(lead.last_contacted_at).toLocaleDateString()}</p>}
                {lead.follow_up_date && (
                  <Badge variant="outline" className="text-xs text-warning border-warning/30">
                    <Clock className="mr-1 h-3 w-3" /> Follow-up: {lead.follow_up_date}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {!lead.has_website && <Badge variant="destructive" className="text-xs"><Globe className="mr-1 h-3 w-3" /> No Website</Badge>}
              {lead.has_website && !lead.no_ssl && !lead.website_error && !lead.not_mobile_friendly && !lead.outdated_copyright && (
                <Badge variant="outline" className="text-success border-success/30 text-xs"><Check className="mr-1 h-3 w-3" /> Website OK</Badge>
              )}
              {lead.no_ssl && <Badge variant="outline" className="text-destructive border-destructive/30 text-xs"><ShieldOff className="mr-1 h-3 w-3" /> No SSL</Badge>}
              {lead.website_error && <Badge variant="outline" className="text-destructive border-destructive/30 text-xs"><AlertTriangle className="mr-1 h-3 w-3" /> Site Error</Badge>}
              {lead.not_mobile_friendly && <Badge variant="outline" className="text-warning border-warning/30 text-xs"><Smartphone className="mr-1 h-3 w-3" /> Not Mobile Friendly</Badge>}
              {lead.outdated_copyright && <Badge variant="outline" className="text-warning border-warning/30 text-xs"><CalendarX className="mr-1 h-3 w-3" /> Outdated ©</Badge>}
              {typeof lead.rating === "number" && (
                <Badge variant="outline" className={`text-xs ${lead.rating < 4.0 ? "text-warning border-warning/30" : "text-muted-foreground border-border"}`}>
                  <Star className="mr-1 h-3 w-3" /> {lead.rating}
                </Badge>
              )}
              {typeof lead.review_count === "number" && (
                <Badge variant="outline" className={`text-xs ${lead.review_count < 10 ? "text-warning border-warning/30" : "text-muted-foreground border-border"}`}>
                  <MessageSquare className="mr-1 h-3 w-3" /> {lead.review_count} reviews
                </Badge>
              )}
              {typeof lead.quality_score === "number" && (
                <Badge variant="outline" className={`text-xs ${lead.quality_score <= 50 ? "text-hot border-hot/30" : lead.quality_score <= 75 ? "text-warning border-warning/30" : "text-muted-foreground border-border"}`}>
                  <TrendingDown className="mr-1 h-3 w-3" /> Quality {lead.quality_score}/100
                </Badge>
              )}
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs"><Tag className="mr-1 h-3 w-3" />{tag}</Badge>
                ))}
              </div>
            )}

            {lead.screenshot_url && (
              <div className="rounded-md overflow-hidden border border-border/30 relative">
                {!screenshotError ? (
                  <img
                    key={screenshotKey}
                    src={`${lead.screenshot_url}${screenshotKey > 0 ? `?retry=${screenshotKey}` : ""}`}
                    alt={`${lead.business_name} website`}
                    className="w-full h-48 object-cover object-top"
                    onError={() => setScreenshotError(true)}
                  />
                ) : (
                  <div className="w-full h-48 flex flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground">
                    <Globe className="h-10 w-10 opacity-40" />
                    <p className="text-xs">Screenshot unavailable</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScreenshotError(false);
                        setScreenshotKey((k) => k + 1);
                      }}
                    >
                      <Loader2 className="mr-1 h-3 w-3" /> Retry
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border/30 pt-4">
              <p className="text-sm font-medium mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    variant={lead.status === s.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateStatus(s.value)}
                    disabled={lead.status === s.value}
                  >
                    {s.label}
                  </Button>
                ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrapeContacts}
                    disabled={!lead.website || scraping}
                  >
                    {scraping ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
                    Find Contact Info
                  </Button>
                </div>
              </div>

              {/* Scraped Contact Info */}
              {(lead.scraped_emails?.length > 0 || lead.scraped_phones?.length > 0 || lead.contact_scrape_status) && (
                <div className="border-t border-border/30 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Scraped Contact Info</p>
                    {lead.contact_scrape_status && (
                      <Badge variant="outline" className={`text-xs ${
                        lead.contact_scrape_status === "success" ? "text-success border-success/30" :
                        lead.contact_scrape_status === "partial" ? "text-warning border-warning/30" :
                        lead.contact_scrape_status === "no_data" ? "text-muted-foreground" :
                        lead.contact_scrape_status === "error" ? "text-destructive border-destructive/30" :
                        "text-muted-foreground"
                      }`}>
                        {lead.contact_scrape_status}
                      </Badge>
                    )}
                  </div>
                  {lead.scraped_emails?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Emails found:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.scraped_emails.map((email, i) => (
                          <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => copyContent(email)}>
                            <Mail className="mr-1 h-3 w-3" /> {email} <Copy className="ml-1 h-2.5 w-2.5 opacity-50" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.scraped_phones?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Phones found:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.scraped_phones.map((phone, i) => (
                          <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => copyContent(phone)}>
                            <Phone className="mr-1 h-3 w-3" /> {phone} <Copy className="ml-1 h-2.5 w-2.5 opacity-50" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.contact_scraped_at && (
                    <p className="text-xs text-muted-foreground">Last scraped: {new Date(lead.contact_scraped_at).toLocaleString()}</p>
                  )}
                </div>
              )}
            </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={editForm.business_name || ""} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={editForm.contact_name || ""} onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })} placeholder="e.g. John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Zip</Label>
                <Input value={editForm.zip || ""} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="e.g. Restaurant, HVAC" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Website</Label>
                <Input value={editForm.website || ""} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={tagsStr} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} placeholder="e.g. priority, needs-followup, local" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={saveDetails} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[60px]"
              />
              <Button onClick={addNote} disabled={addingNote || !newNote.trim()} className="self-end">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-3">
              {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>}
              {notes.map((note) => (
                <Card key={note.id} className="border-border/30">
                  <CardContent className="p-3">
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateNote(note.id)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleString()}
                            {note.updated_at !== note.created_at && " (edited)"}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteNote(note.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {lead.ai_audit && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI Audit</span>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(lead.ai_audit!)}><Copy className="h-3 w-3" /></Button>
                </div>
                <p className="text-muted-foreground whitespace-pre-line text-xs">{lead.ai_audit}</p>
              </div>
            )}
            {lead.ai_insight && (
              <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-primary flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> Why This Lead</span>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(lead.ai_insight!)}><Copy className="h-3 w-3" /></Button>
                </div>
                <p className="text-muted-foreground whitespace-pre-line text-xs">{lead.ai_insight}</p>
              </div>
            )}
            {lead.competitor_insight && (
              <div className="rounded-md bg-warning/5 border border-warning/10 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-warning flex items-center gap-1"><Users2 className="h-3.5 w-3.5" /> Competitor Insight</span>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(lead.competitor_insight!)}><Copy className="h-3 w-3" /></Button>
                </div>
                <p className="text-muted-foreground whitespace-pre-line text-xs">{lead.competitor_insight}</p>
              </div>
            )}

            {messages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Previous Messages</p>
                {messages.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="rounded-md bg-muted/30 p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{msg.type}</Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyContent(msg.content)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line line-clamp-3">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {offers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Previous Offers</p>
                {offers.slice(0, 3).map((offer) => (
                  <div key={offer.id} className="rounded-md bg-muted/30 p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">{new Date(offer.created_at).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyContent(offer.content)}><Copy className="h-3 w-3" /></Button>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line line-clamp-3">{offer.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border/30 pt-4">
              <Button
                onClick={() => setOfferBuilderOpen(true)}
                className="w-full mb-3 bg-gradient-to-r from-primary to-primary/80"
                size="lg"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Open Offer Builder (Before/After + Letter)
              </Button>
              <p className="text-sm font-medium mb-3">Generate New Content</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: "email", icon: Mail, label: "Email" },
                  { type: "dm", icon: MessageCircle, label: "DM" },
                  { type: "sms", icon: Smartphone, label: "SMS" },
                  { type: "proposal", icon: FileText, label: "Proposal" },
                  { type: "audit", icon: Sparkles, label: "Audit" },
                  { type: "video_script", icon: Video, label: "Video Script" },
                  { type: "call_script", icon: PhoneCall, label: "Call Script" },
                ].map(({ type, icon: Icon, label }) => (
                  <Button key={type} variant="outline" size="sm" onClick={() => generateAI(type)} disabled={generating}>
                    {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Icon className="mr-1 h-3 w-3" />}
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {generatedContent && (
              <div className="rounded-md border border-primary/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generated Content</span>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(generatedContent)}>
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </Button>
                </div>
                <Textarea value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} className="min-h-[150px] font-mono text-xs" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      <OfferBuilderModal
        lead={lead}
        open={offerBuilderOpen}
        onOpenChange={setOfferBuilderOpen}
      />
    </Dialog>
  );
};

export default LeadDetailModal;
