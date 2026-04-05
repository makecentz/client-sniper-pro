import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, Phone, MapPin, Flame, AlertTriangle, Camera, Save } from "lucide-react";
import { type SearchResult, type Lead } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const SearchPanel = () => {
  const { user } = useAuth();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [screenshots, setScreenshots] = useState<Record<number, string>>({});

  const handleSearch = async () => {
    if (!city || !businessType) {
      toast.error("Please enter a city and business type");
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-businesses", {
        body: { city, state, business_type: businessType, zip_code: zipCode || undefined },
      });
      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setResults(data.leads || []);
      toast.success(`Found ${data.leads?.length || 0} businesses`);
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSaveLead = async (result: SearchResult, idx: number) => {
    if (!user) return;
    setSavingId(idx);
    try {
      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        business_name: result.business_name,
        phone: result.phone,
        address: result.address,
        website: result.website,
        score: result.score,
        screenshot_url: screenshots[idx] || null,
      });
      if (error) throw error;
      toast.success(`Saved "${result.business_name}" to leads`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save lead");
    } finally {
      setSavingId(null);
    }
  };

  const captureScreenshot = async (url: string, idx: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("capture-screenshot", {
        body: { url },
      });
      if (error) throw error;
      if (data.screenshot_url) {
        setScreenshots((prev) => ({ ...prev, [idx]: data.screenshot_url }));
        toast.success("Screenshot captured");
      }
    } catch {
      toast.error("Screenshot capture failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Search Businesses</h1>
        <p className="text-sm text-muted-foreground">Find local businesses and identify high-value leads</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-[1.5fr_0.7fr_0.7fr_1.5fr_auto]">
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input
                placeholder="78701"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Input placeholder="Plumber, Dentist..." value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleSearch} disabled={searching}>
                <Search className="mr-2 h-4 w-4" />
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Results ({results.length})</h2>
          {results.map((result, idx) => (
            <Card key={idx} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{result.business_name}</span>
                      {result.score === "hot" ? (
                        <Badge className="bg-hot/10 text-hot border-hot/20">
                          <Flame className="mr-1 h-3 w-3" /> Hot Lead
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Needs Upgrade
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {result.address}</span>
                      {result.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {result.phone}</span>}
                      {result.website ? (
                        <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {result.website}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-hot"><Globe className="h-3.5 w-3.5" /> No website</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {result.website && (
                      <Button size="sm" variant="ghost" onClick={() => captureScreenshot(result.website!, idx)}>
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => handleSaveLead(result, idx)} disabled={savingId === idx}>
                      <Save className="mr-1 h-4 w-4" /> {savingId === idx ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
                {screenshots[idx] && (
                  <div className="rounded-md overflow-hidden border border-border/30">
                    <img src={screenshots[idx]} alt={`${result.business_name} website`} className="w-full h-48 object-cover object-top" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
