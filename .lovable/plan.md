

## Fix: Search not returning businesses *with* websites

### Root cause
Outscraper's `maps/search-v3` endpoint returns Google Maps results, which are heavily skewed toward businesses **with** websites. But our query `"barbershop in Philadelphia, PA"` with `limit=40` is returning a list where the businesses without websites happen to dominate the top results — and our score model penalizes them so heavily (−60) that they outrank everything else.

Looking more carefully at `search-businesses/index.ts`:

1. **Sorting**: `leads.sort((a, b) => a.quality_score - b.quality_score)` puts the *worst* score first — i.e. all the no-website businesses (score 40) bubble to the top, pushing weak-website ones (score 60–90) off the visible part of the list.
2. **No SSL false positive**: the `if (url.startsWith("http://"))` check fires *before* we follow redirects. Most modern sites are listed by Outscraper as `http://...` but redirect to `https`. We're flagging clean sites as "No SSL" — but more importantly, we never re-check the final URL.
3. **Result limit on UI side**: `SearchPanel.tsx` likely renders all returned leads, but if 30+ no-website leads come back first, the user perceives "only no-website results."
4. **Outscraper field name**: we read `r.site`, but Outscraper sometimes returns the website under `r.website` or `r.site` depending on the endpoint version. If `site` is undefined for businesses that DO have websites, every result gets flagged as no-website.

### The fix

**1. `supabase/functions/search-businesses/index.ts`**

- Read website from multiple possible Outscraper fields: `r.site || r.website || r.url || null`. Log the first raw result so we can verify field names in logs.
- Fix SSL check: only flag `no_ssl` if the **final** URL (after redirect) is still `http://`. Capture `res.url` from the fetch response.
- Diversify results: instead of pure ascending sort by `quality_score`, interleave so users see a mix of no-website + weak-website leads. Concretely:
  - Split into two buckets: `noWebsite` (score ≤ 40) and `weakWebsite` (41 ≤ score ≤ 90).
  - Sort each bucket ascending by score.
  - Interleave: first 5 from each, then alternate, so the result list always shows both categories.
- Increase the Outscraper limit so we get more businesses *with* websites in the candidate pool: `limit = pro ? 60 : 20`.
- Add `console.log` lines for: raw count, count with website, count without, final returned count by category. This makes future debugging trivial via edge function logs.

**2. Verification**
After deploying, run a search for "barbershop in Philadelphia, PA" and check the edge function logs to confirm:
- raw results contain businesses with websites
- the website field is being read correctly
- the final response includes both `no_website` and `weak_site`/`outdated`/`low_reputation` leads

### Files changed
- `supabase/functions/search-businesses/index.ts`

### Out of scope
- No DB schema changes
- No UI changes (the UI already renders whatever the function returns)

