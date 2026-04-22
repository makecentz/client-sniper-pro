

## Mirror Search Panel Logic in Heatmap

The Heatmap currently only shows businesses **without** websites. The Search panel returns BOTH no-website AND weak-website leads (low quality_score). I'll align the Heatmap to use the same scoring + bucketing logic.

### Edge function: `supabase/functions/heatmap-search/index.ts`

Replace the no-website-only filter with the full Search-panel pipeline:

1. **Add `checkWebsite()`** — port verbatim from `search-businesses` (SSL, mobile-friendly, copyright, reachability checks via 5s fetch).
2. **Add `computeQualityScore()`** — port verbatim (no website +60, no SSL +20, not mobile +20, outdated copyright +15/25, low rating +10/20, few reviews +10/15).
3. **For each Outscraper result within the radius**:
   - If it has a website → run `checkWebsite()` and score it
   - If no website → score directly (skip fetch)
   - Keep only `quality_score <= 90` (actionable)
   - Apply min-rating filter and `exclude_saved` as today
4. **Bucket + interleave** — same as Search: alternate weak-website and no-website so the map shows a healthy mix.
5. **Return enriched lead shape** including `has_website`, `website`, `website_issues`, `score` (`hot` / `weak_site` / `outdated` / `low_reputation` / `no_website`), and `quality_score`.

Note: website checks add latency. To stay snappy, run them with `Promise.all()` (already the pattern in Search) and keep the Outscraper limit at 20 (free) / 50 (pro).

### Frontend: `src/pages/dashboard/Heatmap.tsx`

1. **Extend `HeatmapLead` type** to include `has_website: boolean`, `website: string | null`, `website_issues: string[]`, `score: string`.
2. **Result card badge** — replace hardcoded "No Website" badge with dynamic logic:
   - No website → red "No Website"
   - Has website → amber "Weak Site" (or specific reason like "No SSL", "Outdated", "Low Reviews" based on first issue)
3. **`handleSave` / `handleViewLead`** — stop hardcoding `has_website: false`, `website: null`, `website_issues: ["No Website"]`. Use the lead's actual values so saved leads carry their real data into Saved Leads.
4. **Map pin color** — keep current high/med/low coloring (already driven by `priority_label`, which the new scoring sets correctly).
5. **Empty-state copy** — change "No no-website businesses found" → "No qualifying leads found in this area. Try a larger radius or another ZIP."
6. **Header copy** — change "Find local businesses without websites" → "Find local businesses that need help — no websites or weak ones."
7. **Button label** — "Find Website Leads" → "Find Leads".

### Out of scope
- No DB schema changes (existing `leads` columns already cover this).
- No changes to Search panel itself.
- Plan/usage limits stay the same (still counts as one search).

### Risk
Adding website fetches per result will slow Heatmap searches from ~2s to ~5–8s for 20 results (matching Search panel timing). Acceptable for parity.

