

## Plan: Enhanced Website Contact Scraper

### Summary
Upgrade the existing `analyze-website` edge function to also scrape `/contact`, `/contact-us`, `/about`, and `/about-us` pages. Store all found emails/phones as arrays, add scrape status tracking, and add a "Find Contact Info" button to the lead modal.

### Database Changes (Migration)

Add columns to `leads` table:
- `contact_scrape_status` (text, default `null`) — values: pending, success, partial, no_data, error
- `contact_scraped_at` (timestamptz, nullable)
- `scraped_phones` (text[], default '{}')
- `scraped_emails` (text[], default '{}')

### Backend: New Edge Function `scrape-lead-contacts`

Separate from `analyze-website` (which does technical audit). This function:
- Accepts `{ lead_id }`, validates auth + ownership
- Fetches the lead's website URL
- Fetches homepage + `/contact`, `/contact-us`, `/about`, `/about-us` (parallel, 6s timeout each, ignore failures)
- Combines all HTML, extracts all emails and phones using existing regex logic
- Deduplicates, lowercases emails, prioritizes contact-related prefixes (info@, contact@, hello@, support@)
- Saves: `scraped_emails`, `scraped_phones`, best email to `email` (if empty), best phone to `phone` (if empty), `contact_scrape_status`, `contact_scraped_at`
- Returns structured result

### Frontend: Lead Modal Integration

**Overview tab** — add a "Find Contact Info" button in the quick actions area:
- Disabled if no website exists
- Shows spinner while scraping
- On success: updates lead data locally, shows toast
- On partial/no_data: shows appropriate feedback

**Overview tab** — add a "Contact Info" section showing:
- Primary email/phone (already shown)
- Additional scraped emails/phones as smaller badges
- Scrape status + last scraped timestamp
- Copy buttons for each

### Files Changed
1. New migration — add `contact_scrape_status`, `contact_scraped_at`, `scraped_phones`, `scraped_emails` columns
2. `supabase/functions/scrape-lead-contacts/index.ts` — new edge function
3. `src/lib/mock-data.ts` — add new fields to Lead interface
4. `src/components/LeadDetailModal.tsx` — add Find Contact Info button + scraped data display
5. `src/pages/dashboard/SavedLeads.tsx` — update `mapLead` for new fields

