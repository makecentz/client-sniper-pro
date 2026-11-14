export const HERO_SEARCH_KEY = "ch_hero_search";

export function parseHeroSearch(niche: string, location: string) {
  const parts = location.trim().split(",");
  const state = parts.length > 1 ? (parts.pop() ?? "").trim().toUpperCase() : "";
  return { industry: niche.trim(), city: parts.join(",").trim(), state };
}

export function readHeroSearch() {
  try {
    const value = JSON.parse(sessionStorage.getItem(HERO_SEARCH_KEY) ?? "null");
    if (value && typeof value.industry === "string" && typeof value.city === "string" && typeof value.state === "string") {
      return { industry: value.industry, city: value.city, state: value.state };
    }
  } catch { /* Storage is optional. */ }
  return { industry: "", city: "", state: "" };
}