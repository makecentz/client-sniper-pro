import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Loader2, RefreshCw } from "lucide-react";

type KeyRow = {
  key_name: string;
  masked: string;
  source: "override" | "builtin" | "missing";
  updated_at: string | null;
};

const LABELS: Record<string, { label: string; hint: string }> = {
  OUTSCRAPER_API_KEY: { label: "Outscraper", hint: "Powers business search and the heatmap." },
  SCREENSHOTONE_API_KEY: { label: "ScreenshotOne", hint: "Captures website screenshots for leads." },
  GOOGLE_MAPS_API_KEY: { label: "Google Maps", hint: "Maps and geocoding on the heatmap." },
  STRIPE_SECRET_KEY: { label: "Stripe Secret Key", hint: "Checkout, billing portal, subscriptions." },
  STRIPE_WEBHOOK_SECRET: { label: "Stripe Webhook Secret", hint: "Verifies incoming Stripe webhooks." },
  RESEND_API_KEY: { label: "Resend (Email)", hint: "Sends marketing and transactional email." },
  SITE_URL: { label: "Site URL", hint: "Base URL used in emails and checkout redirects." },
};

export const ApiKeysManager = () => {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-api-keys", { body });
    if (error) throw new Error(error.message);
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, unknown>;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list" });
      setKeys((data.keys as KeyRow[]) ?? []);
    } catch (e) {
      toast.error("Could not load API keys", { description: String((e as Error).message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (name: string) => {
    const value = (drafts[name] || "").trim();
    if (!value) return;
    setBusy(name + ":save");
    try {
      await call({ action: "set", key_name: name, value });
      setDrafts((d) => ({ ...d, [name]: "" }));
      toast.success("Saved", { description: `${LABELS[name]?.label ?? name} updated.` });
      await load();
    } catch (e) {
      toast.error("Save failed", { description: String((e as Error).message) });
    } finally { setBusy(null); }
  };

  const clear = async (name: string) => {
    setBusy(name + ":clear");
    try {
      await call({ action: "clear", key_name: name });
      toast.success("Reverted", { description: "Now using the built-in value." });
      await load();
    } catch (e) {
      toast.error("Failed", { description: String((e as Error).message) });
    } finally { setBusy(null); }
  };

  const test = async (name: string) => {
    setBusy(name + ":test");
    try {
      const res = await call({ action: "test", key_name: name, value: drafts[name] || "" });
      if (res.ok) toast.success("Key works", { description: String(res.message ?? "") });
      else toast.error("Key failed", { description: String(res.message ?? "") });
    } catch (e) {
      toast.error("Test failed", { description: String((e as Error).message) });
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Update the third-party keys the app runs on. Saved values override the built-in ones — no code changes needed.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((k) => (
            <div key={k.key_name} className="rounded-lg border border-border/60 bg-background/40 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{LABELS[k.key_name]?.label ?? k.key_name}</span>
                <Badge variant={k.source === "override" ? "default" : k.source === "builtin" ? "secondary" : "destructive"}>
                  {k.source === "override" ? "Custom" : k.source === "builtin" ? "Built-in" : "Not set"}
                </Badge>
                {k.masked && <code className="text-xs text-muted-foreground">{k.masked}</code>}
                {k.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    updated {new Date(k.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{LABELS[k.key_name]?.hint}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type={k.key_name === "SITE_URL" ? "text" : "password"}
                  placeholder={k.key_name === "SITE_URL" ? "https://clienthunterai.com" : "Paste new value"}
                  value={drafts[k.key_name] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [k.key_name]: e.target.value }))}
                  className="sm:flex-1"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button onClick={() => save(k.key_name)} disabled={!drafts[k.key_name]?.trim() || busy === k.key_name + ":save"}>
                    {busy === k.key_name + ":save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                  </Button>
                  <Button variant="outline" onClick={() => test(k.key_name)} disabled={busy === k.key_name + ":test"}>
                    {busy === k.key_name + ":test" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test
                  </Button>
                  {k.source === "override" && (
                    <Button variant="ghost" onClick={() => clear(k.key_name)} disabled={busy === k.key_name + ":clear"}>
                      Revert
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Values are stored securely on the backend and are never shown in full again after saving.
          </p>
        </div>
      )}
    </div>
  );
};

export default ApiKeysManager;
