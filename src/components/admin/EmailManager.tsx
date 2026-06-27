import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Send, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface Template {
  id: string;
  slug: string;
  subject: string;
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  hero_image_url: string | null;
  enabled: boolean;
}

interface Broadcast {
  id: string;
  subject: string;
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  hero_image_url: string | null;
  audience: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface MarketingLogRow {
  id: string;
  recipient_email: string;
  kind: string;
  template_slug: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    [{ align: [] }],
    ["clean"],
  ],
};

const SLUG_LABELS: Record<string, string> = {
  drip_day_0: "Day 0 — Welcome",
  drip_day_1: "Day 1 — Workflow",
  drip_day_3: "Day 3 — Halfway reminder",
  drip_day_7: "Day 7 — Final offer",
};

export function EmailManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [log, setLog] = useState<MarketingLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTplId, setActiveTplId] = useState<string | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // broadcast composer
  const [bcSubject, setBcSubject] = useState("");
  const [bcHeadline, setBcHeadline] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcCtaLabel, setBcCtaLabel] = useState("");
  const [bcCtaUrl, setBcCtaUrl] = useState("");
  const [bcHero, setBcHero] = useState("");
  const [bcAudience, setBcAudience] = useState("all");
  const [bcSending, setBcSending] = useState(false);

  const activeTpl = useMemo(
    () => templates.find((t) => t.id === activeTplId) || null,
    [templates, activeTplId],
  );

  const reload = async () => {
    setLoading(true);
    const [tplsRes, bcRes, logRes] = await Promise.all([
      supabase.from("email_templates").select("*").like("slug", "drip_%").order("slug"),
      supabase.from("email_broadcasts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("marketing_email_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const tpls = (tplsRes.data || []) as Template[];
    setTemplates(tpls);
    if (tpls.length && !activeTplId) setActiveTplId(tpls[0].id);
    setBroadcasts((bcRes.data || []) as Broadcast[]);
    setLog((logRes.data || []) as MarketingLogRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const saveTemplate = async (patch: Partial<Template>) => {
    if (!activeTpl) return;
    setSavingTpl(true);
    const { error } = await supabase.from("email_templates").update(patch).eq("id", activeTpl.id);
    if (error) toast.error("Failed to save");
    else {
      setTemplates((prev) => prev.map((t) => (t.id === activeTpl.id ? { ...t, ...patch } : t)));
      toast.success("Saved");
    }
    setSavingTpl(false);
  };

  const sendTest = async (source: "template" | "broadcast") => {
    if (!testTo.trim()) { toast.error("Enter a test email"); return; }
    const payload = source === "template" && activeTpl
      ? {
          to: testTo.trim(), subject: activeTpl.subject, headline: activeTpl.headline,
          body: activeTpl.body, ctaLabel: activeTpl.cta_label, ctaUrl: activeTpl.cta_url,
          heroImageUrl: activeTpl.hero_image_url,
        }
      : {
          to: testTo.trim(), subject: bcSubject, headline: bcHeadline, body: bcBody,
          ctaLabel: bcCtaLabel, ctaUrl: bcCtaUrl, heroImageUrl: bcHero || null,
        };
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke("send-marketing-email", { body: payload });
    setSendingTest(false);
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Failed");
    else toast.success(`Test sent to ${testTo}`);
  };

  const sendBroadcast = async () => {
    if (!bcSubject.trim()) { toast.error("Subject required"); return; }
    setBcSending(true);
    const { data: ins, error: insErr } = await supabase.from("email_broadcasts").insert({
      subject: bcSubject, headline: bcHeadline, body: bcBody,
      cta_label: bcCtaLabel, cta_url: bcCtaUrl, hero_image_url: bcHero || null,
      audience: bcAudience, status: "sending",
    }).select("id").single();
    if (insErr || !ins) { toast.error("Failed to create broadcast"); setBcSending(false); return; }

    const { data, error } = await supabase.functions.invoke("send-broadcast", { body: { broadcastId: ins.id } });
    setBcSending(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Send failed");
    } else {
      toast.success(`Broadcast sent to ${(data as any)?.sent ?? 0} users`);
      setBcSubject(""); setBcHeadline(""); setBcBody(""); setBcCtaLabel(""); setBcCtaUrl(""); setBcHero("");
    }
    reload();
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Email Marketing</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="drip">
          <TabsList>
            <TabsTrigger value="drip">Trial Drip (4 emails)</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="log">Send Log</TabsTrigger>
          </TabsList>

          {/* ===== Drip ===== */}
          <TabsContent value="drip" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Four automated emails sent over 7 days to new free signups. Drip stops automatically when a user upgrades to Pro or unsubscribes.
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={activeTplId === t.id ? "default" : "outline"}
                  onClick={() => setActiveTplId(t.id)}
                >
                  {SLUG_LABELS[t.slug] || t.slug}
                  {!t.enabled && <Badge variant="secondary" className="ml-2">Off</Badge>}
                </Button>
              ))}
            </div>

            {activeTpl && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label>Subject</Label>
                    <Input value={activeTpl.subject} onChange={(e) =>
                      setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, subject: e.target.value } : t))} />
                  </div>
                  <div>
                    <Label>Headline (in email)</Label>
                    <Input value={activeTpl.headline} onChange={(e) =>
                      setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, headline: e.target.value } : t))} />
                  </div>
                  <div>
                    <Label>Hero image URL (optional)</Label>
                    <Input placeholder="https://..." value={activeTpl.hero_image_url || ""} onChange={(e) =>
                      setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, hero_image_url: e.target.value } : t))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CTA label</Label>
                      <Input value={activeTpl.cta_label} onChange={(e) =>
                        setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, cta_label: e.target.value } : t))} />
                    </div>
                    <div>
                      <Label>CTA URL</Label>
                      <Input value={activeTpl.cta_url} onChange={(e) =>
                        setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, cta_url: e.target.value } : t))} />
                    </div>
                  </div>
                  <div>
                    <Label>Body</Label>
                    <div className="bg-card">
                      <ReactQuill
                        theme="snow"
                        value={activeTpl.body}
                        modules={quillModules}
                        onChange={(html) =>
                          setTemplates((p) => p.map((t) => t.id === activeTpl.id ? { ...t, body: html } : t))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={activeTpl.enabled}
                      onCheckedChange={(v) => saveTemplate({ enabled: v })}
                    />
                    <span className="text-sm text-muted-foreground">{activeTpl.enabled ? "Enabled" : "Disabled (skipped in drip)"}</span>
                    <Button className="ml-auto" disabled={savingTpl} onClick={() => saveTemplate({
                      subject: activeTpl.subject, headline: activeTpl.headline, body: activeTpl.body,
                      cta_label: activeTpl.cta_label, cta_url: activeTpl.cta_url, hero_image_url: activeTpl.hero_image_url || null,
                    })}>
                      {savingTpl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Input placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                    <Button variant="outline" disabled={sendingTest} onClick={() => sendTest("template")}>
                      {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Send test</>}
                    </Button>
                  </div>
                </div>
                <PreviewPane
                  subject={activeTpl.subject} headline={activeTpl.headline} body={activeTpl.body}
                  ctaLabel={activeTpl.cta_label} ctaUrl={activeTpl.cta_url} hero={activeTpl.hero_image_url}
                />
              </div>
            )}
          </TabsContent>

          {/* ===== Broadcast ===== */}
          <TabsContent value="broadcast" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Send a one-off email blast to all users, just Free, or just Pro. Unsubscribed addresses are skipped.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={bcAudience} onValueChange={setBcAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="free">Free users only</SelectItem>
                      <SelectItem value="pro">Pro users only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Subject</Label><Input value={bcSubject} onChange={(e) => setBcSubject(e.target.value)} /></div>
                <div><Label>Headline</Label><Input value={bcHeadline} onChange={(e) => setBcHeadline(e.target.value)} /></div>
                <div><Label>Hero image URL</Label><Input value={bcHero} onChange={(e) => setBcHero(e.target.value)} placeholder="https://..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CTA label</Label><Input value={bcCtaLabel} onChange={(e) => setBcCtaLabel(e.target.value)} /></div>
                  <div><Label>CTA URL</Label><Input value={bcCtaUrl} onChange={(e) => setBcCtaUrl(e.target.value)} /></div>
                </div>
                <div>
                  <Label>Body</Label>
                  <div className="bg-card"><ReactQuill theme="snow" value={bcBody} modules={quillModules} onChange={setBcBody} /></div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Input placeholder="test@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                  <Button variant="outline" disabled={sendingTest} onClick={() => sendTest("broadcast")}>
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Eye className="h-4 w-4 mr-2" />Send test</>}
                  </Button>
                  <Button disabled={bcSending} onClick={sendBroadcast}>
                    {bcSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Send broadcast</>}
                  </Button>
                </div>
              </div>
              <PreviewPane subject={bcSubject} headline={bcHeadline} body={bcBody} ctaLabel={bcCtaLabel} ctaUrl={bcCtaUrl} hero={bcHero} />
            </div>

            {broadcasts.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 mt-6">Recent broadcasts</h4>
                <div className="rounded-md border border-border/40 divide-y divide-border/40">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{b.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.audience} · {new Date(b.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Sent {b.sent_count}</Badge>
                        {b.failed_count > 0 && <Badge variant="destructive">Failed {b.failed_count}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== Log ===== */}
          <TabsContent value="log" className="pt-4">
            <div className="rounded-md border border-border/40 divide-y divide-border/40 max-h-[28rem] overflow-y-auto">
              {log.length === 0 && <div className="p-4 text-sm text-muted-foreground">No marketing emails sent yet.</div>}
              {log.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="font-mono">{l.recipient_email}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.kind}{l.template_slug ? ` · ${l.template_slug}` : ""} · {new Date(l.created_at).toLocaleString()}
                    </div>
                    {l.error && <div className="text-xs text-destructive">{l.error}</div>}
                  </div>
                  <Badge variant={l.status === "sent" ? "default" : "destructive"}>{l.status}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PreviewPane({ subject, headline, body, ctaLabel, ctaUrl, hero }: {
  subject: string; headline: string; body: string; ctaLabel: string; ctaUrl: string; hero: string | null;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-[#0F172A] p-4">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-slate-800 shadow">
        <div className="text-sm font-bold text-slate-900">ClientHunter AI</div>
        <div className="mt-1 text-xs text-slate-500">Subject: {subject || "(no subject)"}</div>
        {hero && <img src={hero} alt="" className="mt-3 w-full rounded-lg" />}
        {headline && <h2 className="mt-4 text-lg font-semibold text-slate-900">{headline}</h2>}
        <div className="prose prose-sm mt-2 text-slate-700" dangerouslySetInnerHTML={{ __html: body || "<p class='text-slate-400 italic'>Body preview…</p>" }} />
        {ctaLabel && ctaUrl && (
          <a href={ctaUrl} className="mt-4 inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white">{ctaLabel}</a>
        )}
      </div>
    </div>
  );
}
