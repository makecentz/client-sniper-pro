

## Plan: Enrich Lead Data with Website Quality Signals

### Overview
Enhance the search-businesses edge function to check each result's website for quality issues (404 errors, no SSL, not mobile-friendly, outdated copyright) and extract email addresses. These signals drive a smarter lead scoring system. The frontend will display the new data points.

### Database Changes

Add new columns to the `leads` table:
- `email` (text, nullable) — business email from Outscraper
- `has_website` (boolean, default false)
- `website_error` (boolean, default false) — site returns 404/error
- `no_ssl` (boolean, default false) — no HTTPS
- `not_mobile_friendly` (boolean, default false)
- `outdated_copyright` (boolean, default false) — copyright year < 2022
- `website_issues` (text[], nullable) — summary list of issues found

### Edge Function: search-businesses/index.ts

After getting Outscraper results, for each business that has a website:

1. **Extract email** — Outscraper returns `email` or `emails` fields; use those directly
2. **Check website URL** — Attempt a `fetch()` to the site with a 5-second timeout:
   - **Has website**: `site` field exists and is non-empty
   - **Website error**: HTTP status >= 400 or fetch throws
   - **No SSL**: URL starts with `http://` (not `https://`)
   - **Not mobile friendly**: Check for `<meta name="viewport">` in the HTML response — absence indicates not mobile-optimized
   - **Outdated copyright**: Regex scan HTML for `©` or `copyright` followed by a year < 2022
3. **Scoring**: A lead is "hot" if ANY of: no website, website error, no SSL, not mobile friendly, outdated copyright. Otherwise "needs_upgrade".

Website checks will be done in parallel (Promise.allSettled) with a 5-second timeout per site to avoid blocking.

### Frontend: SearchPanel.tsx & mock-data.ts

**SearchResult interface** — add: `email`, `has_website`, `website_error`, `no_ssl`, `not_mobile_friendly`, `outdated_copyright`, `website_issues`

**Lead interface** — add same fields

**Result cards** — show:
- Email if available
- Issue badges (No SSL, 404, Not Mobile, Outdated) as small colored badges
- Updated score logic display

**SavedLeads.tsx** — display email and website issue badges on saved lead cards

### Technical Details

- Outscraper v3 returns `email`, `emails`, `phone`, `site` fields — we'll use those directly for contact info
- Website checks run server-side in the edge function to avoid CORS issues
- Each website fetch uses `AbortController` with 5s timeout
- HTML is fetched as text (not rendered) so viewport/mobile check is heuristic (meta viewport tag presence)
- Copyright check uses regex: `/(?:©|copyright)\s*(\d{4})/gi` and checks if max year < 2022

### Files to Change
1. **Migration** — add new columns to `leads` table
2. **supabase/functions/search-businesses/index.ts** — add website quality checks and email extraction
3. **src/lib/mock-data.ts** — update SearchResult and Lead interfaces
4. **src/pages/dashboard/SearchPanel.tsx** — display new fields and issue badges
5. **src/pages/dashboard/SavedLeads.tsx** — display email and issue badges on saved leads

