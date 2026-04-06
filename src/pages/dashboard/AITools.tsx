import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MessageCircle, Smartphone, FileText, RefreshCw, Copy, ExternalLink, Video, PhoneCall, Briefcase, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Lead } from "@/lib/mock-data";
import { toast } from "sonner";

const AITools = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState("");
  const [outreachType, setOutreachType] = useState("email");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [dfyNotes, setDfyNotes] = useState("");
  const [dfyOpen, setDfyOpen] = useState(false);
  const [dfySubmitting, setDfySubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLeads(data.map((d) => ({
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
        })));
      });
  }, [user]);

  const generate = async (type: string) => {
    if (!selectedLead) {
      toast.error("Select a lead first");
      return;
    }
    const lead = leads.find((l) => l.id === selectedLead);
    if (!lead) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { type, lead },
      });
      if (error) { toast.error("Failed to generate content"); return; }
      if (data?.error) { toast.error(data.error); return; }
      setGeneratedContent(data.content);
      toast.success("AI content generated!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  const openInEmailClient = () => {
    const lead = leads.find((l) => l.id === selectedLead);
    if (!lead || !generatedContent) return;
    let subject = `Website services for ${lead.business_name}`;
    let body = generatedContent;
    const lines = generatedContent.split("\n");
    if (lines[0]?.toLowerCase().startsWith("subject:")) {
      subject = lines[0].replace(/^subject:\s*/i, "").trim();
      body = lines.slice(1).join("\n").trim();
    }
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const submitDFY = async () => {
    if (!selectedLead || !user) { toast.error("Select a lead first"); return; }
    setDfySubmitting(true);
    try {
      const { error } = await supabase.from("dfy_requests").insert({
        user_id: user.id,
        lead_id: selectedLead,
        notes: dfyNotes,
      });
      if (error) throw error;
      toast.success("Request submitted! We'll be in touch.");
      setDfyOpen(false);
      setDfyNotes("");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setDfySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
        <p className="text-sm text-muted-foreground">Generate outreach, proposals, scripts, and more with AI</p>
      </div>

      {/* Lead Selector */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label>Select Lead</Label>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Outreach */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Generate Outreach</CardTitle>
            <CardDescription>Personalized outreach messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { type: "email", icon: Mail, label: "Email" },
                { type: "dm", icon: MessageCircle, label: "DM" },
                { type: "sms", icon: Smartphone, label: "SMS" },
              ].map(({ type, icon: Icon, label }) => (
                <Button key={type} variant={outreachType === type ? "default" : "secondary"} size="sm" onClick={() => setOutreachType(type)}>
                  <Icon className="mr-1 h-3.5 w-3.5" /> {label}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={() => generate(outreachType)} disabled={generating}>
              {generating ? "Generating..." : "Generate Message"}
            </Button>
          </CardContent>
        </Card>

        {/* Offer */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Generate Offer</CardTitle>
            <CardDescription>AI-crafted service proposal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("offer")} disabled={generating}>
              <FileText className="mr-2 h-4 w-4" /> Generate Offer
            </Button>
          </CardContent>
        </Card>

        {/* Proposal */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">📄 Generate Proposal</CardTitle>
            <CardDescription>Full client proposal with analysis & pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("proposal")} disabled={generating}>
              <Briefcase className="mr-2 h-4 w-4" /> Generate Proposal
            </Button>
          </CardContent>
        </Card>

        {/* Audit */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Website Audit</CardTitle>
            <CardDescription>AI analysis of web presence</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("audit")} disabled={generating}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate Audit
            </Button>
          </CardContent>
        </Card>

        {/* Video Script */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">🎬 Video Pitch Script</CardTitle>
            <CardDescription>15-30s TikTok/Instagram script</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("video_script")} disabled={generating}>
              <Video className="mr-2 h-4 w-4" /> Create Video Script
            </Button>
          </CardContent>
        </Card>

        {/* Call Script */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">📞 Call Script</CardTitle>
            <CardDescription>Cold call script with objection handling</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("call_script")} disabled={generating}>
              <PhoneCall className="mr-2 h-4 w-4" /> Generate Call Script
            </Button>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Follow-Ups</CardTitle>
            <CardDescription>Follow-up sequences</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="secondary" onClick={() => generate("followup1")} disabled={generating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Follow-Up #1
            </Button>
            <Button variant="secondary" onClick={() => generate("followup2")} disabled={generating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Follow-Up #2
            </Button>
          </CardContent>
        </Card>

        {/* Done For You */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">🚀 Done For You</CardTitle>
            <CardDescription>Want us to close this client for you?</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dfyOpen} onOpenChange={setDfyOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Submit DFY Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Done For You Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Selected Lead</Label>
                    <Input disabled value={leads.find(l => l.id === selectedLead)?.business_name || "Select a lead first"} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes / Instructions</Label>
                    <Textarea value={dfyNotes} onChange={(e) => setDfyNotes(e.target.value)} placeholder="Any special instructions..." />
                  </div>
                  <Button className="w-full" onClick={submitDFY} disabled={dfySubmitting || !selectedLead}>
                    {dfySubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Generated content */}
      {generatedContent && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Generated Content</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="mr-1 h-4 w-4" /> Copy
              </Button>
              {outreachType === "email" && (
                <Button variant="outline" size="sm" onClick={openInEmailClient}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Send via Email
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} className="min-h-[200px] font-mono text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AITools;
