import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Smartphone, FileText, RefreshCw, Copy } from "lucide-react";
import { mockLeads } from "@/lib/mock-data";
import { toast } from "sonner";

const AITools = () => {
  const [selectedLead, setSelectedLead] = useState("");
  const [outreachType, setOutreachType] = useState("email");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = (type: string) => {
    if (!selectedLead) {
      toast.error("Select a lead first");
      return;
    }
    const lead = mockLeads.find((l) => l.id === selectedLead);
    if (!lead) return;

    setGenerating(true);
    // Mock AI generation
    setTimeout(() => {
      const templates: Record<string, string> = {
        email: `Subject: Transform ${lead.business_name}'s Online Presence\n\nHi there,\n\nI noticed that ${lead.business_name} ${lead.website ? "has a website that could benefit from a modern redesign" : "doesn't have a website yet"}. In today's digital world, a strong online presence is crucial for attracting new customers.\n\nI specialize in building high-converting websites for businesses like yours. I'd love to show you how a professional website could help grow ${lead.business_name}.\n\nWould you be open to a quick 10-minute call this week?\n\nBest regards`,
        dm: `Hey! 👋 I came across ${lead.business_name} and love what you're doing. Quick question — ${lead.website ? "have you thought about refreshing your website?" : "have you considered getting a professional website?"} I help local businesses boost their online presence. Would love to chat if you're interested!`,
        sms: `Hi! I help businesses like ${lead.business_name} get more customers with professional websites. ${lead.website ? "I noticed your site could use an upgrade." : "I noticed you don't have a website yet."} Interested in a free consultation? Reply YES to learn more.`,
        offer: `Website Package for ${lead.business_name}\n\n✅ Custom responsive website — $997\n✅ Monthly hosting & maintenance — $49/mo\n✅ SEO setup & Google listing — included\n✅ Contact form & booking system — included\n\n🎁 BONUS: AI Voice Assistant setup (valued at $297) — FREE if you sign up this week\n\nTotal: $997 one-time + $49/mo\n💰 ROI: Just 2-3 new customers/month covers the cost`,
        followup1: `Hi again! I reached out about a week ago regarding a website for ${lead.business_name}. I know you're busy — just wanted to quickly share that one of my recent clients saw a 40% increase in calls within the first month of launching their new site.\n\nWould love to help ${lead.business_name} see similar results. Any interest in a quick chat?`,
        followup2: `Hey! Final follow-up here — I have a few spots open this month for new website projects. If ${lead.business_name} is ready to grow online, I'd love to help.\n\nNo pressure at all — just didn't want you to miss out. Let me know either way! 👍`,
      };
      setGeneratedContent(templates[type] || templates.email);
      setGenerating(false);
      toast.success("Message generated");
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
        <p className="text-sm text-muted-foreground">Generate outreach messages, offers, and follow-ups with AI</p>
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
                {mockLeads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generate Outreach */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Generate Outreach</CardTitle>
            <CardDescription>Create personalized outreach messages</CardDescription>
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
              {generating ? "Generating..." : "Generate Message"}
            </Button>
          </CardContent>
        </Card>

        {/* Generate Offer */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Generate Offer</CardTitle>
            <CardDescription>Create a service offer package</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" onClick={() => generate("offer")} disabled={generating}>
              <FileText className="mr-2 h-4 w-4" /> Generate Offer
            </Button>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Generate Follow-Ups</CardTitle>
            <CardDescription>Create follow-up sequences</CardDescription>
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

      {/* Generated Content */}
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
