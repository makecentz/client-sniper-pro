import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Save, Wand2, Check, X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EVENT_TYPES = [
  "signed_up", "started_trial", "booked_demo", "upgraded_account",
  "launched_first_campaign", "got_new_client", "closed_lead", "custom_message",
] as const;

type Settings = Record<string, any>;
type EventRow = {
  id: string; event_type: string; first_name: string; last_initial: string;
  city: string; state: string | null; custom_message: string | null;
  source_type: string; is_real_event: boolean; is_approved: boolean;
  is_active: boolean; priority: number; impressions: number; clicks: number;
  created_at: string;
};
type NameRow = { id: string; first_name: string; last_initial: string; active: boolean };
type CityRow = { id: string; city: string; state: string | null; display_label: string; active: boolean };
type TemplateRow = { id: string; event_type: string; template_text: string };

const DEFAULT_TEMPLATES: Record<string, string> = {
  signed_up: "{first_name} {last_initial}. just signed up from {city}",
  started_trial: "{first_name} {last_initial}. started a 7-day trial from {city}",
  booked_demo: "{first_name} {last_initial}. booked a demo from {city}",
  upgraded_account: "{first_name} {last_initial}. upgraded their account from {city}",
  launched_first_campaign: "{first_name} {last_initial}. launched their first campaign from {city}",
  got_new_client: "{first_name} {last_initial}. just got a new website client from {city}",
  closed_lead: "{first_name} {last_initial}. closed a lead from {city}",
  custom_message: "{custom_message}",
};

export const SocialProofManager = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [names, setNames] = useState<NameRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [s, ev, nm, ct, tp] = await Promise.all([
      supabase.from("social_proof_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("social_proof_events").select("*").order("created_at", { ascending: false }),
      supabase.from("social_proof_name_pool").select("*").order("first_name"),
      supabase.from("social_proof_city_pool").select("*").order("city"),
      supabase.from("social_proof_templates").select("*").order("event_type"),
    ]);
    if (s.data) setSettings(s.data);
    if (ev.data) setEvents(ev.data as EventRow[]);
    if (nm.data) setNames(nm.data as NameRow[]);
    if (ct.data) setCities(ct.data as CityRow[]);
    if (tp.data) setTemplates(tp.data as TemplateRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // ============ OVERVIEW STATS ============
  const stats = useMemo(() => {
    const active = events.filter((e) => e.is_active && e.is_approved).length;
    const real = events.filter((e) => e.is_real_event).length;
    const manual = events.filter((e) => e.source_type === "manual").length;
    const random = events.filter((e) => e.source_type === "random_generated").length;
    const impressions = events.reduce((s, e) => s + (e.impressions || 0), 0);
    const clicks = events.reduce((s, e) => s + (e.clicks || 0), 0);
    return { active, real, manual, random, impressions, clicks };
  }, [events]);

  // ============ SETTINGS HANDLERS ============
  const updateSetting = (key: string, value: any) => setSettings((s) => (s ? { ...s, [key]: value } : s));
  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { id, created_at, updated_at, ...payload } = settings;
    const { error } = await supabase.from("social_proof_settings").update(payload).eq("id", 1);
    if (error) toast.error("Failed to save settings");
    else toast.success("Settings saved");
    setSavingSettings(false);
  };

  // ============ EVENT HANDLERS ============
  const toggleEvent = async (id: string, field: "is_active" | "is_approved", value: boolean) => {
    const { error } = await supabase.from("social_proof_events").update({ [field]: value }).eq("id", id);
    if (error) return toast.error("Update failed");
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("social_proof_events").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event deleted");
  };
  const addManualEvent = async (form: Partial<EventRow>) => {
    const payload = {
      event_type: form.event_type || "signed_up",
      first_name: form.first_name || "",
      last_initial: form.last_initial || "",
      city: form.city || "",
      state: form.state || null,
      custom_message: form.custom_message || null,
      source_type: "manual",
      is_real_event: false,
      is_approved: true,
      is_active: true,
    };
    if (!payload.first_name || !payload.city) return toast.error("Name and city required");
    const { data, error } = await supabase.from("social_proof_events").insert(payload).select().single();
    if (error) return toast.error("Insert failed");
    setEvents((prev) => [data as EventRow, ...prev]);
    toast.success("Event added");
  };

  // ============ GENERATOR ============
  const [genCount, setGenCount] = useState(25);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([
    "signed_up", "started_trial", "booked_demo", "upgraded_account",
    "launched_first_campaign", "got_new_client", "closed_lead",
  ]);
  const [generating, setGenerating] = useState(false);
  const generateEvents = async () => {
    const activeNames = names.filter((n) => n.active);
    const activeCities = cities.filter((c) => c.active);
    if (!activeNames.length || !activeCities.length || !allowedTypes.length) {
      return toast.error("Need active names, cities, and at least one event type");
    }
    setGenerating(true);
    const rows = Array.from({ length: genCount }).map(() => {
      const n = activeNames[Math.floor(Math.random() * activeNames.length)];
      const c = activeCities[Math.floor(Math.random() * activeCities.length)];
      const t = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
      return {
        event_type: t, first_name: n.first_name, last_initial: n.last_initial,
        city: c.city, state: c.state, source_type: "random_generated",
        is_real_event: false, is_approved: true, is_active: true,
      };
    });
    const { data, error } = await supabase.from("social_proof_events").insert(rows).select();
    setGenerating(false);
    if (error) return toast.error("Generation failed");
    setEvents((prev) => [...(data as EventRow[]), ...prev]);
    toast.success(`Generated ${data?.length || 0} events`);
  };

  // ============ NAMES ============
  const [newName, setNewName] = useState({ first_name: "", last_initial: "" });
  const addName = async () => {
    if (!newName.first_name || !newName.last_initial) return;
    const { data, error } = await supabase.from("social_proof_name_pool").insert(newName).select().single();
    if (error) return toast.error("Add failed");
    setNames((prev) => [...prev, data as NameRow]);
    setNewName({ first_name: "", last_initial: "" });
  };
  const toggleName = async (id: string, active: boolean) => {
    await supabase.from("social_proof_name_pool").update({ active }).eq("id", id);
    setNames((p) => p.map((n) => (n.id === id ? { ...n, active } : n)));
  };
  const deleteName = async (id: string) => {
    await supabase.from("social_proof_name_pool").delete().eq("id", id);
    setNames((p) => p.filter((n) => n.id !== id));
  };

  // ============ CITIES ============
  const [newCity, setNewCity] = useState({ city: "", state: "", display_label: "" });
  const addCity = async () => {
    if (!newCity.city) return;
    const payload = { city: newCity.city, state: newCity.state || null, display_label: newCity.display_label || newCity.city };
    const { data, error } = await supabase.from("social_proof_city_pool").insert(payload).select().single();
    if (error) return toast.error("Add failed");
    setCities((prev) => [...prev, data as CityRow]);
    setNewCity({ city: "", state: "", display_label: "" });
  };
  const toggleCity = async (id: string, active: boolean) => {
    await supabase.from("social_proof_city_pool").update({ active }).eq("id", id);
    setCities((p) => p.map((c) => (c.id === id ? { ...c, active } : c)));
  };
  const deleteCity = async (id: string) => {
    await supabase.from("social_proof_city_pool").delete().eq("id", id);
    setCities((p) => p.filter((c) => c.id !== id));
  };

  // ============ TEMPLATES ============
  const updateTemplate = (event_type: string, template_text: string) => {
    setTemplates((prev) => prev.map((t) => (t.event_type === event_type ? { ...t, template_text } : t)));
  };
  const saveTemplate = async (t: TemplateRow) => {
    const { error } = await supabase.from("social_proof_templates").update({ template_text: t.template_text }).eq("id", t.id);
    if (error) return toast.error("Save failed");
    toast.success("Template saved");
  };
  const restoreTemplate = (event_type: string) => {
    const def = DEFAULT_TEMPLATES[event_type];
    if (def) updateTemplate(event_type, def);
  };

  if (loading || !settings) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /><CardTitle>Social Proof Manager</CardTitle></div>
        </CardHeader>
        <CardContent><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent>
      </Card>
    );
  }

  // ============ ADD EVENT FORM (local state) ============
  const AddEventForm = () => {
    const [form, setForm] = useState<Partial<EventRow>>({ event_type: "signed_up" });
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
        <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
          <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
          <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="First name" value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input placeholder="Initial" maxLength={2} value={form.last_initial || ""} onChange={(e) => setForm({ ...form, last_initial: e.target.value })} />
        <Input placeholder="City" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Input placeholder="State" maxLength={2} value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <Button className="md:col-span-6" onClick={() => addManualEvent(form)}><Plus className="h-4 w-4 mr-1" />Add Event</Button>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /><CardTitle>Social Proof Manager</CardTitle></div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-6 w-full mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="names">Names</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Active Events" value={stats.active} />
              <StatCard label="Real Events" value={stats.real} />
              <StatCard label="Manual" value={stats.manual} />
              <StatCard label="Random" value={stats.random} />
              <StatCard label="Impressions" value={stats.impressions} />
              <StatCard label="Clicks" value={stats.clicks} />
              <StatCard label="Status" value={settings.enabled ? "ON" : "OFF"} highlight={settings.enabled} />
              <StatCard label="Source Mode" value={settings.source_mode} />
            </div>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle label="Enabled" checked={settings.enabled} onChange={(v) => updateSetting("enabled", v)} />
              <Toggle label="Mobile Enabled" checked={settings.mobile_enabled} onChange={(v) => updateSetting("mobile_enabled", v)} />
              <Toggle label="Show Close Button" checked={settings.show_close_button} onChange={(v) => updateSetting("show_close_button", v)} />
              <Toggle label="Auto Rotate" checked={settings.auto_rotate} onChange={(v) => updateSetting("auto_rotate", v)} />
              <Toggle label="Loop Notifications" checked={settings.loop_notifications} onChange={(v) => updateSetting("loop_notifications", v)} />
              <Toggle label="Randomize Order" checked={settings.randomize_order} onChange={(v) => updateSetting("randomize_order", v)} />
              <Toggle label="Show City + State" checked={settings.show_city_state} onChange={(v) => updateSetting("show_city_state", v)} />

              <Field label="Position">
                <Select value={settings.position} onValueChange={(v) => updateSetting("position", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Animation">
                <Select value={settings.animation_type} onValueChange={(v) => updateSetting("animation_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slide-up">Slide Up</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="scale-in">Scale In</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source Mode">
                <Select value={settings.source_mode} onValueChange={(v) => updateSetting("source_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="real_only">Real only</SelectItem>
                    <SelectItem value="manual_only">Manual only</SelectItem>
                    <SelectItem value="random_only">Random only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Click Action">
                <Select value={settings.click_action || "none"} onValueChange={(v) => updateSetting("click_action", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No click</SelectItem>
                    <SelectItem value="signup">Open signup</SelectItem>
                    <SelectItem value="pricing">Open pricing</SelectItem>
                    <SelectItem value="demo">Open demo</SelectItem>
                    <SelectItem value="trial">Open trial</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Display Duration (sec)">
                <Input type="number" min={1} value={settings.display_duration_seconds}
                  onChange={(e) => updateSetting("display_duration_seconds", parseInt(e.target.value) || 5)} />
              </Field>
              <Field label="Delay Between (sec)">
                <Input type="number" min={1} value={settings.delay_between_seconds}
                  onChange={(e) => updateSetting("delay_between_seconds", parseInt(e.target.value) || 8)} />
              </Field>
              <Field label="Auto-expire after (days, blank = never)">
                <Input type="number" min={1} value={settings.auto_expire_days || ""}
                  onChange={(e) => updateSetting("auto_expire_days", e.target.value ? parseInt(e.target.value) : null)} />
              </Field>
            </div>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" />Save Settings</>}
            </Button>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="space-y-4">
            <AddEventForm />

            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4 text-primary" />Random Event Generator</div>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.filter((t) => t !== "custom_message").map((t) => (
                  <Badge
                    key={t}
                    variant={allowedTypes.includes(t) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setAllowedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  >{t}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value) || 25)} className="w-24" />
                <Button size="sm" variant="outline" onClick={() => setGenCount(25)}>25</Button>
                <Button size="sm" variant="outline" onClick={() => setGenCount(50)}>50</Button>
                <Button size="sm" variant="outline" onClick={() => setGenCount(100)}>100</Button>
                <Button onClick={generateEvents} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-1" />Generate</>}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead>City</TableHead>
                    <TableHead>Source</TableHead><TableHead>Approved</TableHead><TableHead>Active</TableHead>
                    <TableHead>Imp</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 200).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{e.event_type}</TableCell>
                      <TableCell>{e.first_name} {e.last_initial}.</TableCell>
                      <TableCell>{e.city}{e.state ? `, ${e.state}` : ""}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.source_type}</Badge></TableCell>
                      <TableCell><Switch checked={e.is_approved} onCheckedChange={(v) => toggleEvent(e.id, "is_approved", v)} /></TableCell>
                      <TableCell><Switch checked={e.is_active} onCheckedChange={(v) => toggleEvent(e.id, "is_active", v)} /></TableCell>
                      <TableCell className="text-muted-foreground">{e.impressions}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteEvent(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {events.length > 200 && <p className="p-2 text-xs text-muted-foreground text-center">Showing first 200 of {events.length}</p>}
            </div>
          </TabsContent>

          {/* NAMES */}
          <TabsContent value="names" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="First name" value={newName.first_name} onChange={(e) => setNewName({ ...newName, first_name: e.target.value })} />
              <Input placeholder="Initial" maxLength={2} className="w-24" value={newName.last_initial} onChange={(e) => setNewName({ ...newName, last_initial: e.target.value })} />
              <Button onClick={addName}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[500px] overflow-auto">
              {names.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                  <span className={n.active ? "" : "text-muted-foreground line-through"}>{n.first_name} {n.last_initial}.</span>
                  <div className="flex gap-1">
                    <Switch checked={n.active} onCheckedChange={(v) => toggleName(n.id, v)} />
                    <Button size="sm" variant="ghost" onClick={() => deleteName(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* CITIES */}
          <TabsContent value="cities" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="City" value={newCity.city} onChange={(e) => setNewCity({ ...newCity, city: e.target.value })} />
              <Input placeholder="State" maxLength={2} className="w-24" value={newCity.state} onChange={(e) => setNewCity({ ...newCity, state: e.target.value })} />
              <Input placeholder="Display label (optional)" value={newCity.display_label} onChange={(e) => setNewCity({ ...newCity, display_label: e.target.value })} />
              <Button onClick={addCity}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[500px] overflow-auto">
              {cities.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                  <span className={c.active ? "" : "text-muted-foreground line-through"}>{c.display_label}{c.state ? `, ${c.state}` : ""}</span>
                  <div className="flex gap-1">
                    <Switch checked={c.active} onCheckedChange={(v) => toggleCity(c.id, v)} />
                    <Button size="sm" variant="ghost" onClick={() => deleteCity(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="space-y-3">
            <p className="text-xs text-muted-foreground">Available variables: <code className="px-1 bg-muted rounded">{"{first_name}"}</code> <code className="px-1 bg-muted rounded">{"{last_initial}"}</code> <code className="px-1 bg-muted rounded">{"{city}"}</code> <code className="px-1 bg-muted rounded">{"{custom_message}"}</code></p>
            {templates.map((t) => {
              const preview = t.template_text
                .replace("{first_name}", "Sarah").replace("{last_initial}", "T")
                .replace("{city}", "Atlanta").replace("{custom_message}", "Custom note");
              return (
                <div key={t.id} className="p-3 rounded-lg border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{t.event_type}</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => restoreTemplate(t.event_type)}>Restore default</Button>
                      <Button size="sm" onClick={() => saveTemplate(t)}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
                    </div>
                  </div>
                  <Textarea rows={2} value={t.template_text} onChange={(e) => updateTemplate(t.event_type, e.target.value)} />
                  <p className="text-xs text-muted-foreground">Preview: <span className="text-foreground">{preview}</span></p>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const StatCard = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className={`p-3 rounded-lg border ${highlight ? "border-primary/50 bg-primary/5" : "border-border/50"}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-2 rounded border border-border/50">
    <Label className="text-sm">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default SocialProofManager;
