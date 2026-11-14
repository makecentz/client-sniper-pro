import { describe, expect, it } from "vitest";
import { dismissSearchResult } from "@/lib/search-results";
import type { SearchResult } from "@/lib/mock-data";

const results: SearchResult[] = ["First", "Second", "Third"].map((business_name) => ({
  business_name, phone: "", address: "", website: null, email: null,
  score: "no_website", has_website: false, website_error: false, no_ssl: false,
  not_mobile_friendly: false, outdated_copyright: false, website_issues: [],
  priority_score: 70, priority_label: "high", rating: null, review_count: 0, quality_score: 100,
}));

describe("dismiss search results", () => {
  it("removes only the chosen business from the shared list/map results", () => {
    const dismissed = dismissSearchResult(results, {}, null, 1);
    expect(dismissed.results.map((r) => r.business_name)).toEqual(["First", "Third"]);
    expect(results).toHaveLength(3);
  });
  it("keeps screenshots and selection attached to the same remaining business", () => {
    const dismissed = dismissSearchResult(results, { 0: "first.png", 1: "second.png", 2: "third.png" }, 2, 1);
    expect(dismissed.screenshots).toEqual({ 0: "first.png", 1: "third.png" });
    expect(dismissed.activeIndex).toBe(1);
  });
  it("clears selection when the selected result is removed", () => {
    expect(dismissSearchResult(results, {}, 1, 1).activeIndex).toBeNull();
  });
});