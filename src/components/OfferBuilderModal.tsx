import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Copy, Sparkles, RefreshCw, ImageOff, Globe, Mail, Wand2, Check, AlertCircle, Save,
} from "lucide-react";
import { type Lead } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfferMockup {
  id: string;
  lead_id: string;
  user_id: string;
  before_image_url: string | null;
  after_image_url: string | null;
  image_prompt: string | null;
  design_brief: string | null;
  offer_short: string | null;
  offer_standard: string | null;
  offer_premium: string | null;
  created_at: string;
}

interface OfferBuilderModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  "Capturing current website",
  "Designing new website concept",
  "Writing offer letter",
  "Finalizing pitch",
];

const OfferBuilderModal = ({ lead, open, onOpenChange }: OfferBuilderModalProps) => {
  const [mockup, setMockup] = useState<OfferMockup | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<"short" | "standard" | "premium">("standard");
  const [editedOffer, setEditedOffer] = useState("");

  const fetchExisting = useCallback(async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("offer_mockups")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setMockup(data as OfferMockup);
  }, [lead]);

  const generate = useCallback(async (regenerate?: "image" | "offer" | "all") => {
    if (!lead) return;
    setLoading(true);
    setError(null);
    setStepIdx(0);
    // Animated step ticker — purely cosmetic
    const ticker = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 4000);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-offer-mockup", {
        body: { lead_id: lead.id, regenerate },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setMockup(data.mockup);
      toast.success("Offer ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }, [lead]);

  useEffect(() => {
    if (!open || !lead) return;
    setMockup(null);
    setError(null);
    setEditedOffer("");
    setVariant("standard");
    fetchExisting().then(() => {
      // Auto-trigger only on first open if nothing exists
    });
  }, [open, lead, fetchExisting]);

  // Auto-generate after we know nothing exists
  useEffect(() => {
    if (!open || !lead || loading) return;
    if (mockup === null) return; // still loading initial fetch
    if (mockup && (mockup.after_image_url || mockup.offer_standard)) return;
    // mockup is "null-but-checked" — actually fetchExisting sets it OR leaves as null state
    // Use a separate flag instead:
  }, [open, lead, mockup, loading]);

  // Cleaner auto-trigger
  useEffect(() => {
    if (!open || !lead) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("offer_mockups")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setMockup(data as OfferMockup);
      } else {
        generate("all");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  useEffect(() => {
    if (!mockup) return;
    const text = mockup[`offer_${variant}` as const] || "";
    setEditedOffer(text);
  }, [variant, mockup]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const fullPitch = lead && mockup
    ? `Hi ${lead.contact_name || "there"},

${editedOffer}

I put together a quick visual concept of how a redesigned ${lead.business_name} site could look — happy to share it on a quick call.

${mockup.after_image_url ? `Concept preview: ${mockup.after_image_url}` : ""}`.trim()
    : "";

  if (!lead) return null;

  const showPlaceholder = !lead.website || !lead.has_website;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Offer Builder — {lead.business_name}
          </DialogTitle>
        </DialogHeader>

        {/* Lead header */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-b border-border/30 pb-3">
          {lead.category && <Badge variant="secondary">{lead.category}</Badge>}
          {lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" className="text-primary hover:underline">{lead.website}</a>}
          <Badge variant="outline" className="capitalize">{lead.status}</Badge>
          {lead.priority_score > 0 && <Badge variant="outline">Priority {lead.priority_score}</Badge>}
        </div>

        {/* Loading state */}
        {loading && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Building your pitch...
              </div>
              <div className="space-y-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className={`flex items-center gap-2 text-xs ${i <= stepIdx ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {i < stepIdx ? <Check className="h-3 w-3 text-success" /> : i === stepIdx ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className="h-3 w-3 rounded-full border border-border" />}
                    {s}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm">{error}</p>
                <Button size="sm" variant="outline" onClick={() => generate("all")}>
                  <RefreshCw className="mr-1 h-3 w-3" /> Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Before / After */}
        {(mockup || !loading) && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Current Website</p>
                <Badge variant="outline" className="text-xs">Before</Badge>
              </div>
              <div className="aspect-[16/10] rounded-md border border-border/40 overflow-hidden bg-muted/20 flex items-center justify-center">
                {mockup?.before_image_url ? (
                  <img src={mockup.before_image_url} alt="Current website" className="w-full h-full object-cover object-top" />
                ) : showPlaceholder ? (
                  <div className="text-center p-6">
                    <ImageOff className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">No Website Presence</p>
                    <p className="text-xs text-muted-foreground mt-1">This business has no current website.</p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <Globe className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-xs">Screenshot pending</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Proposed Redesign</p>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">After · AI Concept</Badge>
              </div>
              <div className="aspect-[16/10] rounded-md border border-primary/30 overflow-hidden bg-muted/20 flex items-center justify-center">
                {mockup?.after_image_url ? (
                  <img src={mockup.after_image_url} alt="Redesign concept" className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <Sparkles className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-xs">{loading ? "Generating concept..." : "No mockup yet"}</p>
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => generate("image")} disabled={loading} className="w-full">
                <RefreshCw className="mr-1 h-3 w-3" /> Regenerate Mockup
              </Button>
            </div>
          </div>
        )}

        {/* Offer letter */}
        {mockup && (mockup.offer_short || mockup.offer_standard || mockup.offer_premium) && (
          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Offer Letter</p>
              <Button size="sm" variant="outline" onClick={() => generate("offer")} disabled={loading}>
                <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
              </Button>
            </div>

            <Tabs value={variant} onValueChange={(v) => setVariant(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="short">Short</TabsTrigger>
                <TabsTrigger value="standard">Standard</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
              </TabsList>
              <TabsContent value={variant} className="mt-3">
                <Textarea
                  value={editedOffer}
                  onChange={(e) => setEditedOffer(e.target.value)}
                  className="min-h-[220px] font-mono text-xs"
                />
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copy(editedOffer, "Offer letter")}>
                <Copy className="mr-1 h-3 w-3" /> Copy Offer Letter
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(fullPitch, "Full pitch")}>
                <Mail className="mr-1 h-3 w-3" /> Copy Full Pitch
              </Button>
              {mockup.after_image_url && (
                <Button size="sm" variant="outline" onClick={() => copy(mockup.after_image_url!, "Mockup link")}>
                  <Copy className="mr-1 h-3 w-3" /> Copy Mockup Link
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!mockup) return;
                const updates: Record<string, string> = {};
                updates[`offer_${variant}`] = editedOffer;
                const { error } = await supabase.from("offer_mockups").update(updates as never).eq("id", mockup.id);
                if (error) toast.error("Save failed"); else { toast.success("Offer saved"); setMockup({ ...mockup, [`offer_${variant}`]: editedOffer }); }
              }}>
                <Save className="mr-1 h-3 w-3" /> Save Edits
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OfferBuilderModal;
