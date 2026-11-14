import { describe, expect, it } from "vitest";
import { HERO_SEARCH_KEY, parseHeroSearch, readHeroSearch } from "@/lib/hero-search";

describe("homepage search handoff", () => {
  it("carries a custom niche and city/state without changing their meaning", () => {
    expect(parseHeroSearch(" Roofers ", " Tampa, fl ")).toEqual({ industry: "Roofers", city: "Tampa", state: "FL" });
  });
  it("restores the search after signup navigation", () => {
    sessionStorage.setItem(HERO_SEARCH_KEY, JSON.stringify(parseHeroSearch("Solar installers", "Miami, FL")));
    expect(readHeroSearch()).toEqual({ industry: "Solar installers", city: "Miami", state: "FL" });
    sessionStorage.removeItem(HERO_SEARCH_KEY);
  });
});