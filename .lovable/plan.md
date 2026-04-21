

## Plan: Expand Search to Include Businesses With Underperforming Websites

### Goal
Currently the search treats "no website" as the primary signal for a hot lead. Expand the logic so businesses **with** websites are also surfaced when their overall quality score is **90 or less** — meaning outdated copyright, missing SSL, not mobile friendly, low Google review rating, or low review count.

### Changes

**1. Update `supabase/functions/search-businesses/index.ts`**

Replace the binary "hot vs needs_upgrade" classification with a unified **quality score (0–100)** where lower = worse = better lead. Surface any business with `quality_score <= 90`.

Quality score model (start at 100, subtract for each issue):
- No website: −60
- Website unreachable / HTTP error: −25
- No SSL: −20
- Not mobile friendly: −20
- Outdated copyright (< 2022): −15 (older = larger penalty, e.g. < 2019: −25)
- Google rating < 4.0: −10
- Google rating < 3.5: −20
- Review count < 10: −10
- Review count < 3: −15

Then:
- `quality_score = max(0, 100 - penalties)`
- Lead is included in results if `quality_score <= 90`
- Map to existing `priority_score` (invert): `priority_score = 100 - quality_score`
- `priority_label`: high (≥60), medium (≥30), low (<30)
- `score` field: `"no_website"` if no site, `"outdated"` if outdated copyright, `"weak_site"` for any other website issue, `"low_reputation"` if only review issues. Keep `"hot"` reserved for top-priority (priority_score ≥ 70).

Also:
- Capture `rating` and `review_count` from Outscraper response and store them on the lead row (requires schema additions below).
- Filter out businesses that score above 90 (i.e. clean modern sites with strong reviews) so users only see actionable leads.

**2. Schema additions (migration)**

Add to `leads` table:
- `rating numeric` (nullable) — Google rating
- `review_count integer` (nullable, default 0) — Google review count
- `quality_score integer` (nullable, default 100) — overall lead quality (lower = better target)

**3. Update `supabase/functions/analyze-website/index.ts`**

Apply the same quality scoring model when a user manually analyzes a single URL, so the priority/score fields stay consistent across both entry points.

**4. UI updates**

- `src/pages/dashboard/SearchPanel.tsx`: Show rating + review count badge on each result card. Update the score badge legend to include the new score values (`outdated`, `weak_site`, `low_reputation`).
- `src/components/LeadDetailModal.tsx`: Display rating, review count, and quality score breakdown so users understand *why* a lead was flagged.
- `src/lib/mock-data.ts` / TypeScript Lead type: add the new fields.

### Technical Notes
- Outscraper already returns `rating` and `reviews` — we just need to persist them.
- The existing `priority_score` logic stays compatible (still 0–100, higher = more urgent), so heatmap and existing sorts keep working.
- No breaking changes to existing leads — new columns are nullable with sensible defaults.

### Files Changed
- `supabase/functions/search-businesses/index.ts`
- `supabase/functions/analyze-website/index.ts`
- `src/pages/dashboard/SearchPanel.tsx`
- `src/components/LeadDetailModal.tsx`
- `src/lib/mock-data.ts`
- New migration: add `rating`, `review_count`, `quality_score` columns to `leads`

