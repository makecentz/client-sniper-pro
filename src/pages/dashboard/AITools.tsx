import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Smartphone, FileText, RefreshCw, Copy, ExternalLink, Video, PhoneCall, Briefcase, Sparkles, Globe, ShieldAlert, ShieldCheck, MonitorSmartphone, CalendarClock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Lead } from "@/lib/mock-data";
import { toast } from "sonner";

type WebsiteAnalysis = {
  has_website: boolean;
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[];
  priority_score: number;
  priority_label: string;
};

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

  // Manual website analysis state
  const [manualUrl, setManualUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysis | null>(null);

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
        })));
      });
  }, [user]);

  const analyzeWebsite = async () => {
    if (!manualUrl.trim()) {
      toast.error("Enter a website URL first");
      return;
    }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: manualUrl.trim(), lead_id: selectedLead || undefined },
      });
      if (error) { toast.error("Failed to analyze website"); return; }
      if (data?.error) { toast.error(data.error); return; }

      setAnalysisResult(data);

      // Update local leads state
      if (selectedLead) {
        setLeads(prev => prev.map(l => l.id === selectedLead ? {
          ...l,
          website: data.website || manualUrl.trim(),
          has_website: true,
          website_error: data.website_error,
          no_ssl: data.no_ssl,
          not_mobile_friendly: data.not_mobile_friendly,
          outdated_copyright: data.outdated_copyright,
          website_issues: data.website_issues,
          priority_score: data.priority_score,
          priority_label: data.priority_label,
          score: "needs_upgrade" as const,
        } : l));
      } else if (data.lead_id) {
        // New lead was created — add to local state and select it
        const newLead: Lead = {
          id: data.lead_id,
          business_name: new URL(manualUrl.trim().startsWith("http") ? manualUrl.trim() : `https://${manualUrl.trim()}`).hostname.replace(/^www\./, ""),
          phone: "",
          address: "",
          website: data.website || manualUrl.trim(),
          email: null,
          has_website: true,
          website_error: data.website_error,
          no_ssl: data.no_ssl,
          not_mobile_friendly: data.not_mobile_friendly,
          outdated_copyright: data.outdated_copyright,
          website_issues: data.website_issues,
          score: "needs_upgrade",
          notes: "",
          priority_score: data.priority_score,
          priority_label: data.priority_label,
          ai_insight: null,
          status: "new",
          follow_up_date: null,
          competitor_insight: null,
        };
        setLeads(prev => [newLead, ...prev]);
        setSelectedLead(data.lead_id);
      }

      toast.success("Website analyzed & saved!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

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

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </Badge>
  );

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
                <SelectValue placeholder="Choose a lead (or leave empty to create new)..." />
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

      {/* Manual Website URL Input */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Manual Website Analysis
          </CardTitle>
          <CardDescription>Enter a website URL to analyze for issues and enrich the lead data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="https://example.com"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && analyzeWebsite()}
            />
            <Button onClick={analyzeWebsite} disabled={analyzing}>
              {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Get Info"}
            </Button>
          </div>

          {analysisResult && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Analysis Results</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge ok={!analysisResult.website_error} label={analysisResult.website_error ? "Site Error" : "Site OK"} />
                <StatusBadge ok={!analysisResult.no_ssl} label={analysisResult.no_ssl ? "No SSL" : "SSL Secure"} />
                <StatusBadge ok={!analysisResult.not_mobile_friendly} label={analysisResult.not_mobile_friendly ? "Not Mobile Friendly" : "Mobile Friendly"} />
                <StatusBadge ok={!analysisResult.outdated_copyright} label={analysisResult.outdated_copyright ? "Outdated Copyright" : "Copyright OK"} />
              </div>
              {analysisResult.website_issues.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Issues Found:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {analysisResult.website_issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Priority: <Badge variant="outline" className="ml-1">{analysisResult.priority_label}</Badge></span>
                <span>Score: {analysisResult.priority_score}/100</span>
              </div>
            </div>
          )}
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
