

## Plan: Make Website URLs Clickable in Search Results

### Problem
Search results already include businesses with websites that need updates (outdated copyright, no SSL, not mobile-friendly, etc.), but the website URL is displayed as plain text — not clickable. This makes it hard to verify the site or pitch the business owner.

### Fix

**`src/pages/dashboard/SearchPanel.tsx`** — one change in the results card (line 342):
- Replace the plain `<span>` showing `result.website` with a clickable `<a>` tag that opens in a new tab, styled with the primary color and underline on hover (matching the manual analysis section's link style)

The backend already returns all qualifying businesses (with or without a website). No edge function changes needed.

