import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Trash2, Upload, Globe, Send, Loader2, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type Bot = any;
type Source = {
  id: string; source_type: "file" | "url"; name: string; status: string;
  source_url: string | null; size_bytes: number | null; error: string | null;
};

export default function ChatbotEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bot, setBot] = useState<Bot | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id || !user?.id) return;
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("chatbots").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("chatbot_kb_sources").select("*").eq("chatbot_id", id).order("created_at", { ascending: false }),
    ]);
    setBot(b); setSources((s as Source[]) || []); setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);

  const save = async () => {
    if (!bot) return;
    setSaving(true);
    const { error } = await supabase
      .from("chatbots")
      .update({
        name: bot.name, client_name: bot.client_name, brand_color: bot.brand_color,
        welcome_message: bot.welcome_message, system_prompt: bot.system_prompt,
        fallback_message: bot.fallback_message, is_active: bot.is_active,
      })
      .eq("id", bot.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const onFile = async (file: File) => {
    if (!bot || !user) return;
    const path = `${user.id}/${bot.id}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("chatbot-kb").upload(path, file);
    if (up.error) { toast.error(up.error.message); return; }
    const { data: src, error } = await supabase
      .from("chatbot_kb_sources")
      .insert({
        chatbot_id: bot.id, user_id: user.id, source_type: "file",
        name: file.name, storage_path: path, size_bytes: file.size, status: "uploading",
      })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setSources((s) => [src as Source, ...s]);
    const { error: fnErr } = await supabase.functions.invoke("chatbot-kb-upload", {
      body: { chatbot_id: bot.id, source_id: src.id },
    });
    if (fnErr) toast.error(fnErr.message);
    load();
  };

  const crawl = async () => {
    if (!crawlUrl.trim() || !bot) return;
    setCrawling(true);
    const { error } = await supabase.functions.invoke("crawl-website", {
      body: { chatbot_id: bot.id, url: crawlUrl.trim() },
    });
    setCrawling(false);
    if (error) toast.error(error.message);
    else { toast.success("Website crawled"); setCrawlUrl(""); load(); }
  };

  const removeSource = async (sid: string) => {
    if (!confirm("Remove this source from the knowledge base?")) return;
    await supabase.functions.invoke("chatbot-kb-delete", { body: { source_id: sid } });
    setSources((s) => s.filter((x) => x.id !== sid));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!bot) return <div className="p-6">Chatbot not found.</div>;

  const widgetUrl = `${window.location.origin}/widget.js`;
  const snippet = `<script src="${widgetUrl}" data-bot-id="${bot.id}" async></script>`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/chatbots")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{bot.name}</h1>
            <p className="text-sm text-muted-foreground">{bot.client_name || "No client name"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={bot.is_active} onCheckedChange={(v) => setBot({ ...bot, is_active: v })} />
            <span className="text-sm">{bot.is_active ? "Active" : "Paused"}</span>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <Tabs defaultValue="kb">
        <TabsList>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="embed">Embed & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="kb" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload files</CardTitle>
              <CardDescription>PDF, DOCX, TXT, or MD. The bot answers using this content.</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileRef} type="file" className="hidden"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Choose file
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crawl a website</CardTitle>
              <CardDescription>We fetch up to 15 pages from the same domain.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="https://client-site.com"
              />
              <Button onClick={crawl} disabled={crawling || !crawlUrl.trim()}>
                {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                Crawl
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sources ({sources.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sources.length === 0 && <p className="text-sm text-muted-foreground">No knowledge sources yet.</p>}
              {sources.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {s.source_type === "file" ? <FileText className="h-4 w-4 shrink-0" /> : <LinkIcon className="h-4 w-4 shrink-0" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm">{s.name}</p>
                      {s.source_url && <p className="truncate text-xs text-muted-foreground">{s.source_url}</p>}
                      {s.error && <p className="text-xs text-destructive">{s.error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "ready" ? "default" : s.status === "error" ? "destructive" : "secondary"}>
                      {s.status}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => removeSource(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Internal name</Label>
                <Input value={bot.name} onChange={(e) => setBot({ ...bot, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client business name</Label>
                <Input value={bot.client_name || ""} onChange={(e) => setBot({ ...bot, client_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Brand color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={bot.brand_color}
                    onChange={(e) => setBot({ ...bot, brand_color: e.target.value })}
                    className="h-10 w-14 rounded border"
                  />
                  <Input value={bot.brand_color} onChange={(e) => setBot({ ...bot, brand_color: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Welcome message</Label>
                <Input value={bot.welcome_message} onChange={(e) => setBot({ ...bot, welcome_message: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>System prompt</Label>
                <Textarea
                  rows={6}
                  value={bot.system_prompt}
                  onChange={(e) => setBot({ ...bot, system_prompt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fallback message (when the bot doesn't know)</Label>
                <Input value={bot.fallback_message} onChange={(e) => setBot({ ...bot, fallback_message: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <EmbedAndTest bot={bot} snippet={snippet} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmbedAndTest({ bot, snippet }: { bot: Bot; snippet: string }) {
  const [thread, setThread] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: bot.welcome_message },
  ]);

  const send = async () => {
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg(""); setSending(true);
    setLog((l) => [...l, { role: "user", text }]);
    try {
      const { data, error } = await supabase.functions.invoke("chatbot-message", {
        body: { bot_id: bot.id, message: text, thread_id: thread },
      });
      if (error) throw error;
      setThread(data.thread_id);
      setLog((l) => [...l, { role: "bot", text: data.reply }]);
    } catch (e: any) {
      setLog((l) => [...l, { role: "bot", text: `Error: ${e.message}` }]);
    } finally { setSending(false); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Embed snippet</CardTitle>
          <CardDescription>Paste this on your client's site, just before {`</body>`}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{snippet}</pre>
          <Button
            variant="outline" size="sm"
            onClick={() => { navigator.clipboard.writeText(snippet); toast.success("Copied"); }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy snippet
          </Button>
          {!bot.is_active && (
            <p className="text-xs text-warning">Bot is paused — enable it to allow the widget to respond.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test chat</CardTitle>
          <CardDescription>Talk to your bot the way your client's visitors will.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64 space-y-2 overflow-y-auto rounded border p-3">
            {log.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <span
                  className={`inline-block max-w-[80%] rounded-lg px-3 py-2 ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={msg} onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !sending) send(); }}
              placeholder="Ask a question..."
            />
            <Button onClick={send} disabled={sending || !msg.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
