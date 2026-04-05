import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Smartphone, FileText, RefreshCw, Copy, Search } from "lucide-react";
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

      if (error) {
        console.error("AI generation error:", error);
        toast.error("Failed to generate content. Please try again.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedContent(data.content);
      toast.success("AI-generated message ready!");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
        <p className="text-sm text-muted-foreground">Generate outreach messages, offers, audits, and follow-ups with AI</p>
      </div>

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
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Generate Outreach</CardTitle>
            <CardDescription>AI-powered personalized outreach messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
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
              {generating ? "Generating with AI..." : "Generate Message"}
            </Button>
          </CardContent>
        </Card>

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

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Website Audit</CardTitle>
            <CardDescription>AI analysis of the lead's web presence</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("audit")} disabled={generating}>
              <Search className="mr-2 h-4 w-4" /> Generate Audit
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Follow-Ups</CardTitle>
            <CardDescription>AI-generated follow-up sequences</CardDescription>
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
      </div>

      {generatedContent && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Generated Content</CardTitle>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-1 h-4 w-4" /> Copy
            </Button>
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
