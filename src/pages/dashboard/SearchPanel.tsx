import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, Phone, MapPin, Mail, Flame, AlertTriangle, Camera, Save, ShieldOff, Smartphone, CalendarX, CheckCircle2, Loader2, Star, MessageSquare, TrendingDown } from "lucide-react";
import { type SearchResult } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getSavedLeadsWarning } from "@/contexts/AuthContext";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type AnalysisResult = {
  lead_id?: string;
  website?: string;
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[];
  priority_score: number;
  priority_label: string;
  scraped_name: string | null;
  scraped_phone: string | null;
  scraped_email: string | null;
  copyright_year: number | null;
};

const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge variant={ok ? "default" : "destructive"} className="gap-1">
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
    {label}
  </Badge>
);

const SearchPanel = () => {
  const { user, refreshLeadCount } = useAuth();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [screenshots, setScreenshots] = useState<Record<number, string>>({});

  // Manual analysis state
  const [manualUrl, setManualUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const savedLimit = user?.saved_leads_limit ?? 100;
  const savedWarning = getSavedLeadsWarning(user?.bonus_saved_slots ?? 0);
  const atLimit = (user?.saved_leads_count ?? 0) >= savedLimit;
  const isPro = user?.plan === "pro";
  const limitMessage = isPro
    ? `You've reached your ${savedLimit} saved leads limit. Delete inactive leads or purchase a Lead Pack for 15 additional slots.`
    : `You've reached the ${savedLimit} saved leads limit. Delete inactive leads to save new ones.`;

  const handleSearch = async () => {
    if (atLimit) {
      toast.error(limitMessage);
      return;
    }
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
    if (atLimit) {
      toast.error(`Lead limit reached (${PRO_LEADS_LIMIT}). Delete old leads to save new ones.`);
      return;
    }
    setSavingId(idx);
    try {
      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        business_name: result.business_name,
        phone: result.phone,
        address: result.address,
        website: result.website,
        email: result.email,
        score: result.score,
        has_website: result.has_website,
        website_error: result.website_error,
        no_ssl: result.no_ssl,
        not_mobile_friendly: result.not_mobile_friendly,
        outdated_copyright: result.outdated_copyright,
        website_issues: result.website_issues,
        screenshot_url: screenshots[idx] || null,
        priority_score: result.priority_score || 0,
        priority_label: result.priority_label || "low",
        rating: result.rating,
        review_count: result.review_count ?? 0,
        quality_score: result.quality_score ?? 100,
      });
      if (error) throw error;
      await refreshLeadCount();
      if ((user.saved_leads_count + 1) >= PRO_LEADS_WARNING) {
        toast.warning(`You have ${user.saved_leads_count + 1}/${PRO_LEADS_LIMIT} leads — start deleting old ones.`);
      } else {
        toast.success(`Saved "${result.business_name}" to leads`);
      }
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

  const analyzeWebsite = async () => {
    if (!manualUrl.trim()) {
      toast.error("Enter a website URL first");
      return;
    }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: manualUrl.trim() },
      });
      if (error) { toast.error("Failed to analyze website"); return; }
      if (data?.error) { toast.error(data.error); return; }
      setAnalysisResult(data);
      toast.success("Website analyzed & saved to leads!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAnalyzing(false);
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
              <Button className="w-full" onClick={handleSearch} disabled={searching || atLimit} title={atLimit ? "Lead limit reached" : undefined}>
                <Search className="mr-2 h-4 w-4" />
                {searching ? "Searching..." : atLimit ? "Limit Reached" : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Website Analysis */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Manual Website Analysis
          </CardTitle>
          <CardDescription>Enter a website URL to scrape business info and detect issues</CardDescription>
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
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
              {/* Scraped Business Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Business Info</h4>
                <div className="grid gap-2 text-sm">
                  {analysisResult.scraped_name && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{analysisResult.scraped_name}</span>
                    </div>
                  )}
                  {analysisResult.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <a href={analysisResult.website.startsWith("http") ? analysisResult.website : `https://${analysisResult.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{analysisResult.website}</a>
                    </div>
                  )}
                  {analysisResult.scraped_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{analysisResult.scraped_phone}</span>
                    </div>
                  )}
                  {analysisResult.scraped_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{analysisResult.scraped_email}</span>
                    </div>
                  )}
                  {analysisResult.copyright_year && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarX className="h-3.5 w-3.5" />
                      <span>Copyright: {analysisResult.copyright_year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Website Status Badges */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Website Analysis</h4>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge ok={!analysisResult.website_error} label={analysisResult.website_error ? "Site Error" : "Site OK"} />
                  <StatusBadge ok={!analysisResult.no_ssl} label={analysisResult.no_ssl ? "No SSL" : "SSL Secure"} />
                  <StatusBadge ok={!analysisResult.not_mobile_friendly} label={analysisResult.not_mobile_friendly ? "Not Mobile Friendly" : "Mobile Friendly"} />
                  <StatusBadge ok={!analysisResult.outdated_copyright} label={analysisResult.outdated_copyright ? "Outdated Copyright" : "Copyright OK"} />
                </div>
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
                {analysisResult.lead_id && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Saved to Leads
                  </Badge>
                )}
              </div>
            </div>
          )}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{result.business_name}</span>
                      {result.score === "hot" && (
                        <Badge className="bg-hot/10 text-hot border-hot/20">
                          <Flame className="mr-1 h-3 w-3" /> Hot Lead
                        </Badge>
                      )}
                      {result.score === "no_website" && (
                        <Badge className="bg-hot/10 text-hot border-hot/20">
                          <Globe className="mr-1 h-3 w-3" /> No Website
                        </Badge>
                      )}
                      {result.score === "outdated" && (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <CalendarX className="mr-1 h-3 w-3" /> Outdated Site
                        </Badge>
                      )}
                      {result.score === "weak_site" && (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Weak Site
                        </Badge>
                      )}
                      {result.score === "low_reputation" && (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <TrendingDown className="mr-1 h-3 w-3" /> Low Reputation
                        </Badge>
                      )}
                      {result.score === "needs_upgrade" && (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Needs Upgrade
                        </Badge>
                      )}
                      {typeof result.quality_score === "number" && (
                        <Badge variant="outline" className="text-xs">
                          Quality {result.quality_score}/100
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {result.address}</span>
                      {result.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {result.phone}</span>}
                      {result.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {result.email}</span>}
                      {result.website ? (
                        <a href={result.website.startsWith("http") ? result.website : `https://${result.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-3.5 w-3.5" /> {result.website}</a>
                      ) : (
                        <span className="flex items-center gap-1 text-hot"><Globe className="h-3.5 w-3.5" /> No website</span>
                      )}
                      {result.rating !== null && result.rating !== undefined && (
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {result.rating}</span>
                      )}
                      {typeof result.review_count === "number" && (
                        <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {result.review_count} reviews</span>
                      )}
                    </div>
                    {result.website_issues && result.website_issues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {result.no_ssl && (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                            <ShieldOff className="mr-1 h-3 w-3" /> No SSL
                          </Badge>
                        )}
                        {result.website_error && (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Site Error
                          </Badge>
                        )}
                        {result.not_mobile_friendly && (
                          <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                            <Smartphone className="mr-1 h-3 w-3" /> Not Mobile Friendly
                          </Badge>
                        )}
                        {result.outdated_copyright && (
                          <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                            <CalendarX className="mr-1 h-3 w-3" /> Outdated Copyright
                          </Badge>
                        )}
                      </div>
                    )}
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
