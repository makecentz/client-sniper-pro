import { describe, expect, it } from "vitest";
import { toLeadTrackerPayload } from "@/lib/lead-tracker";
import type { SearchResult } from "@/lib/mock-data";

const result = {
  business_name: "Miami Jeweler", website: "example.com", phone: "445-326-9638",
  email: null, address: "Miami, FL", priority_score: 75,
} as SearchResult;

describe("Lead Tracker transfer", () => {
  it("sends the business, opportunity score and ClientHunter source using the receiver's field names", () => {
    expect(toLeadTrackerPayload(result, { city: "Miami", state: "FL", zip: "33101", industry: "Jeweler" })).toEqual({
      business_name: "Miami Jeweler", website_url: "https://example.com", phone: "445-326-9638", email: "",
      address: "Miami, FL", city: "Miami", state: "FL", zip: "33101", industry: "Jeweler",
      opportunity_score: 75, source: "clienthunter-ai",
    });
  });
  it("supports businesses without websites", () => {
    expect(toLeadTrackerPayload({ ...result, website: null }, { city: "", state: "", zip: "33101", industry: "Jeweler" }).website_url).toBe("");
  });
});