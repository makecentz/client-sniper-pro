import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Search, Loader2, Star, Phone, ExternalLink, Bookmark, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import LeadDetailModal from "@/components/LeadDetailModal";
import type { Lead } from "@/lib/mock-data";

interface HeatmapLead {
  business_name: string;
  phone: string;
  address: string;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  latitude: number | null;
  longitude: number | null;
  priority_score: number;
  priority_label: "high" | "medium" | "low";
  distance_miles: number | null;
  has_website: boolean;
  website: string | null;
  website_issues: string[];
  score: string;
  quality_score?: number;
  no_ssl?: boolean;
  not_mobile_friendly?: boolean;
  outdated_copyright?: boolean;
  website_error?: boolean;
}

const badgeForLead = (lead: HeatmapLead): { label: string; tone: "destructive" | "warning" } => {
  if (!lead.has_website) return { label: "No Website", tone: "destructive" };
  const issues = lead.website_issues || [];
  const first = issues.find((i) => i !== "No Website");
  if (first?.startsWith("No SSL")) return { label: "No SSL", tone: "warning" };
  if (first?.startsWith("Outdated")) return { label: "Outdated", tone: "warning" };
  if (first?.startsWith("Not Mobile")) return { label: "Not Mobile", tone: "warning" };
  if (first?.startsWith("HTTP") || first?.startsWith("Website Unreachable")) return { label: "Site Error", tone: "warning" };
  return { label: "Weak Site", tone: "warning" };
};

const RADIUS_OPTIONS = [1, 3, 5, 10, 25];
const containerStyle = { width: "100%", height: "100%" };
const mapLibraries: ("places")[] = [];

const Heatmap = () => {
  const { user, refreshLeadCount } = useAuth();
  const navigate = useNavigate();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(true);

  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("5");
  const [niche, setNiche] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [excludeSaved, setExcludeSaved] = useState(true);

  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [leads, setLeads] = useState<HeatmapLead[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Fetch Maps API key
  useEffect(() => {
    supabase.functions.invoke("get-maps-key").then(({ data, error }) => {
      if (error || !data?.apiKey) {
        toast({ title: "Map unavailable", description: "Could not load map key. Contact support.", variant: "destructive" });
      } else {
        setApiKey(data.apiKey);
      }
      setKeyLoading(false);
    });
  }, []);

  const handleSearch = async () => {
    if (!/^\d{5}$/.test(zip)) {
      toast({ title: "Invalid ZIP", description: "Enter a 5-digit US ZIP code.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSelectedIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke("heatmap-search", {
        body: {
          zip_code: zip,
          radius_miles: Number(radius),
          business_type: niche,
          min_rating: Number(minRating),
          exclude_saved: excludeSaved,
        },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.code === "LIMIT_REACHED") {
          toast({ title: "Daily limit reached", description: "Upgrade to Pro for unlimited searches.", variant: "destructive" });
          navigate("/dashboard/settings");
        } else {
          toast({ title: "Search failed", description: data.error, variant: "destructive" });
        }
        return;
      }
      setCenter(data.center);
      setLeads(data.leads || []);
      if (mapRef.current) {
        mapRef.current.panTo(data.center);
      }
      if (!data.leads?.length) {
        toast({ title: "No results", description: "No qualifying leads found in this area. Try a larger radius or another ZIP." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Search failed", description: msg, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const leadKey = (l: HeatmapLead) => `${l.business_name}|${l.address}`.toLowerCase();

  const handleSave = async (lead: HeatmapLead) => {
    if (!user) return;
    const key = leadKey(lead);
    setSavingKey(key);
    try {
      // Dedupe by name + user
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_name", lead.business_name)
        .maybeSingle();
      if (existing) {
        setSavedKeys((prev) => new Set(prev).add(key));
        toast({ title: "Already saved", description: `${lead.business_name} is already in your leads.` });
        return;
      }
      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        business_name: lead.business_name,
        phone: lead.phone,
        address: lead.address,
        category: lead.category,
        has_website: lead.has_website,
        website: lead.website,
        score: lead.score || (lead.has_website ? "weak_site" : "no_website"),
        priority_score: lead.priority_score,
        priority_label: lead.priority_label,
        website_issues: lead.website_issues || [],
        no_ssl: !!lead.no_ssl,
        not_mobile_friendly: !!lead.not_mobile_friendly,
        outdated_copyright: !!lead.outdated_copyright,
        website_error: !!lead.website_error,
        quality_score: lead.quality_score ?? null,
        rating: lead.rating,
        review_count: lead.reviews ?? 0,
        status: "new",
      });
      if (error) throw error;
      setSavedKeys((prev) => new Set(prev).add(key));
      await refreshLeadCount();
      toast({ title: "Lead saved", description: lead.business_name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save lead";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  const handleViewLead = async (lead: HeatmapLead) => {
    if (!user) return;
    // Find or create the saved lead, then open modal
    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .eq("business_name", lead.business_name)
      .maybeSingle();

    let row = existing;
    if (!row) {
      const { data: inserted, error } = await supabase
        .from("leads")
        .insert({
          user_id: user.id,
          business_name: lead.business_name,
          phone: lead.phone,
          address: lead.address,
          category: lead.category,
          has_website: lead.has_website,
          website: lead.website,
          score: lead.score || (lead.has_website ? "weak_site" : "no_website"),
          priority_score: lead.priority_score,
          priority_label: lead.priority_label,
          website_issues: lead.website_issues || [],
          no_ssl: !!lead.no_ssl,
          not_mobile_friendly: !!lead.not_mobile_friendly,
          outdated_copyright: !!lead.outdated_copyright,
          website_error: !!lead.website_error,
          quality_score: lead.quality_score ?? null,
          rating: lead.rating,
          review_count: lead.reviews ?? 0,
          status: "new",
        })
        .select("*")
        .single();
      if (error) {
        toast({ title: "Could not open lead", description: error.message, variant: "destructive" });
        return;
      }
      row = inserted;
      setSavedKeys((prev) => new Set(prev).add(leadKey(lead)));
      await refreshLeadCount();
    }

    setModalLead({
      ...row!,
      phone: row!.phone || "",
      address: row!.address || "",
      score: (row!.score as "hot" | "needs_upgrade") || "hot",
      notes: row!.notes || "",
      tags: row!.tags || [],
      website_issues: row!.website_issues || [],
    } as Lead);
  };

  const mapOptions = useMemo<google.maps.MapOptions>(() => ({
    disableDefaultUI: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
  }), []);

  const pinColor = (label: "high" | "medium" | "low") =>
    label === "high" ? "#ef4444" : label === "medium" ? "#f59e0b" : "#3b82f6";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" /> Heatmap
        </h1>
        <p className="text-sm text-muted-foreground">Find local businesses that need help — no websites or weak ones.</p>
      </div>

      {/* Search controls */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" maxLength={5} placeholder="90210" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label>Radius</Label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r} mile{r > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="niche">Business type (optional)</Label>
              <Input id="niche" placeholder="e.g. plumbers, salons" value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Min rating</Label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="3">3.0+</SelectItem>
                  <SelectItem value="4">4.0+</SelectItem>
                  <SelectItem value="4.5">4.5+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={searching || keyLoading} className="w-full">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Find Leads</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="exclude" checked={excludeSaved} onCheckedChange={(v) => setExcludeSaved(!!v)} />
            <Label htmlFor="exclude" className="text-sm font-normal cursor-pointer">Exclude already saved leads</Label>
          </div>
        </CardContent>
      </Card>

      {/* Map + results */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="border-border/50 lg:col-span-2 overflow-hidden">
          <CardContent className="p-0 h-[600px] relative">
            {keyLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !apiKey ? (
              <div className="flex h-full items-center justify-center text-muted-foreground p-4 text-center">
                Map key unavailable.
              </div>
            ) : (
              <MapView
                apiKey={apiKey}
                center={center}
                leads={leads}
                selectedIdx={selectedIdx}
                setSelectedIdx={setSelectedIdx}
                mapOptions={mapOptions}
                mapRef={mapRef}
                pinColor={pinColor}
                handleViewLead={handleViewLead}
                handleSave={handleSave}
                savingKey={savingKey}
                savedKeys={savedKeys}
                leadKey={leadKey}
              />
            )}
          </CardContent>
        </Card>

        {/* Results panel */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Results</span>
              <Badge variant="outline">{leads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 max-h-[560px] overflow-y-auto">
            {leads.length === 0 && !searching && (
              <div className="text-sm text-muted-foreground text-center py-8">
                {center ? "No qualifying leads found in this area. Try a larger radius or another ZIP." : "Enter a ZIP code to start."}
              </div>
            )}
            {searching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {leads.map((lead, idx) => {
              const key = leadKey(lead);
              const isSaved = savedKeys.has(key);
              return (
                <div
                  key={`${lead.business_name}-${idx}`}
                  className={`rounded-md border p-3 cursor-pointer transition-colors ${selectedIdx === idx ? "border-primary bg-muted/40" : "border-border/40 hover:border-primary/40"}`}
                  onClick={() => {
                    setSelectedIdx(idx);
                    if (mapRef.current && lead.latitude != null && lead.longitude != null) {
                      mapRef.current.panTo({ lat: lead.latitude, lng: lead.longitude });
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{lead.business_name}</div>
                      {lead.category && <div className="text-xs text-muted-foreground truncate">{lead.category}</div>}
                    </div>
                    {(() => {
                      const b = badgeForLead(lead);
                      const cls = b.tone === "destructive"
                        ? "text-destructive border-destructive/40"
                        : "text-warning border-warning/40";
                      return <Badge variant="outline" className={`text-[10px] shrink-0 ${cls}`}>{b.label}</Badge>;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{lead.address}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    {lead.rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{lead.rating}</span>}
                    {lead.distance_miles != null && <span>{lead.distance_miles.toFixed(1)} mi</span>}
                  </div>
                  <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => handleViewLead(lead)}>
                      <ExternalLink className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleSave(lead)} disabled={savingKey === key || isSaved}>
                      <Bookmark className="h-3 w-3 mr-1" /> {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/dashboard/ai-tools")} title="Generate outreach">
                      <Sparkles className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <LeadDetailModal
        lead={modalLead}
        open={!!modalLead}
        onOpenChange={(open) => { if (!open) setModalLead(null); }}
        onLeadUpdated={(updated) => setModalLead(updated)}
      />
    </div>
  );
};

interface MapViewProps {
  apiKey: string;
  center: { lat: number; lng: number } | null;
  leads: HeatmapLead[];
  selectedIdx: number | null;
  setSelectedIdx: (i: number | null) => void;
  mapOptions: google.maps.MapOptions;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  pinColor: (l: "high" | "medium" | "low") => string;
  handleViewLead: (l: HeatmapLead) => void;
  handleSave: (l: HeatmapLead) => void;
  savingKey: string | null;
  savedKeys: Set<string>;
  leadKey: (l: HeatmapLead) => string;
}

const MapView = ({
  apiKey, center, leads, selectedIdx, setSelectedIdx, mapOptions, mapRef,
  pinColor, handleViewLead, handleSave, savingKey, savedKeys, leadKey,
}: MapViewProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: mapLibraries,
    id: "google-map-script",
  });

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center text-destructive p-4 text-center">
        Failed to load Google Maps. Check API key restrictions.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center || { lat: 39.8283, lng: -98.5795 }}
      zoom={center ? 12 : 4}
      options={mapOptions}
      onLoad={(map) => { mapRef.current = map; }}
    >
      {leads.map((lead, idx) => (
        lead.latitude != null && lead.longitude != null && (
          <Marker
            key={`${lead.business_name}-${idx}`}
            position={{ lat: lead.latitude, lng: lead.longitude }}
            onClick={() => setSelectedIdx(idx)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: pinColor(lead.priority_label),
              fillOpacity: 0.95,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
          />
        )
      ))}
      {selectedIdx != null && leads[selectedIdx]?.latitude != null && leads[selectedIdx]?.longitude != null && (
        <InfoWindow
          position={{ lat: leads[selectedIdx].latitude!, lng: leads[selectedIdx].longitude! }}
          onCloseClick={() => setSelectedIdx(null)}
        >
          <div className="text-foreground bg-background p-1 min-w-[200px] max-w-[260px] space-y-1.5">
            <div className="font-semibold text-sm">{leads[selectedIdx].business_name}</div>
            {leads[selectedIdx].category && <div className="text-xs text-muted-foreground">{leads[selectedIdx].category}</div>}
            <div className="text-xs">{leads[selectedIdx].address}</div>
            {leads[selectedIdx].phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{leads[selectedIdx].phone}</div>}
            {leads[selectedIdx].rating != null && (
              <div className="text-xs flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{leads[selectedIdx].rating} ({leads[selectedIdx].reviews ?? 0})</div>
            )}
            <Badge variant="outline" className="text-[10px]">Score {leads[selectedIdx].priority_score}</Badge>
            <div className="flex gap-1 pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewLead(leads[selectedIdx])}>
                <ExternalLink className="h-3 w-3 mr-1" /> View
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => handleSave(leads[selectedIdx])} disabled={savingKey === leadKey(leads[selectedIdx]) || savedKeys.has(leadKey(leads[selectedIdx]))}>
                <Bookmark className="h-3 w-3 mr-1" /> {savedKeys.has(leadKey(leads[selectedIdx])) ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default Heatmap;
