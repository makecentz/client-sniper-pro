import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Phone, MapPin, Flame, AlertTriangle } from "lucide-react";
import { mockLeads, type Lead } from "@/lib/mock-data";
import { toast } from "sonner";

const SearchPanel = () => {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!city || !businessType) {
      toast.error("Please enter a city and business type");
      return;
    }
    setSearching(true);
    // Mock search — will be replaced with Outscraper API
    setTimeout(() => {
      setResults(mockLeads);
      setSearching(false);
      toast.success(`Found ${mockLeads.length} businesses`);
    }, 1000);
  };

  const handleSaveLead = (lead: Lead) => {
    toast.success(`Saved "${lead.business_name}" to leads`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Search Businesses</h1>
        <p className="text-sm text-muted-foreground">Find local businesses and identify high-value leads</p>
      </div>

      {/* Search Form */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input placeholder="TX" value={state} onChange={(e) => setState(e.target.value)} />
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Results ({results.length})</h2>
          {results.map((lead) => (
            <Card key={lead.id} className="border-border/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{lead.business_name}</span>
                    {lead.score === "hot" ? (
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
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.address}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                    {lead.website ? (
                      <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {lead.website}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-hot"><Globe className="h-3.5 w-3.5" /> No website</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleSaveLead(lead)}>
                  Save Lead
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
