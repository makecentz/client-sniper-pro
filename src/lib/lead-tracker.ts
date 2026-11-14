import type { SearchResult } from "@/lib/mock-data";

export function toLeadTrackerPayload(result: SearchResult, location: { city: string; state: string; zip: string; industry: string }) {
  const website = result.website?.trim() || "";
  return {
    business_name: result.business_name,
    website_url: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
    phone: result.phone || "",
    email: result.email || "",
    address: result.address || "",
    city: location.city,
    state: location.state,
    zip: location.zip,
    industry: location.industry,
    opportunity_score: result.priority_score ?? 0,
    source: "clienthunter-ai" as const,
  };
}