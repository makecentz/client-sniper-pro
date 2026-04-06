

## Plan: Move Website Analysis to Search Page + Add Data Scraping

### What This Does
1. Moves the Manual Website Analysis section from the AI Tools page to the Search page, placed below the business search form
2. Enhances the `analyze-website` edge function to also scrape the page for company name, phone number, email, and copyright year
3. Displays scraped business info alongside the analysis results
4. Saves all scraped data to the leads database

### Changes

**1. Update `supabase/functions/analyze-website/index.ts`**
- After fetching the HTML, extract additional data:
  - **Company name**: from `<title>` tag or `og:site_name` meta tag
  - **Phone**: regex for phone number patterns in the HTML
  - **Email**: regex for email addresses (excluding common generic ones like noreply@)
  - **Copyright year**: already extracted, include in response
- Return these new fields: `scraped_name`, `scraped_phone`, `scraped_email`, `copyright_year`
- When creating/updating the lead, populate `business_name`, `phone`, `email` from scraped data (only if not already set)

**2. Update `src/pages/dashboard/SearchPanel.tsx`**
- Add manual URL input section below the search form card
- Add state for `manualUrl`, `analyzing`, `analysisResult`
- On "Get Info" click, call `analyze-website` edge function
- Display results card showing:
  - Scraped business info (name, phone, email, copyright year)
  - Website issue badges (SSL, mobile, copyright, errors)
  - Priority score/label
- Auto-save to leads database (handled by edge function)
- Show a "Saved to leads" confirmation

**3. Update `src/pages/dashboard/AITools.tsx`**
- Remove the Manual Website Analysis card and related state (`manualUrl`, `analyzing`, `analysisResult`, `analyzeWebsite` function, `StatusBadge` component)
- Keep everything else intact (lead selector, AI tools grid)

### Technical Details
- Phone regex: common US patterns like `(xxx) xxx-xxxx`, `xxx-xxx-xxxx`, `+1xxxxxxxxxx`
- Email regex: standard email pattern, filter out `noreply@`, `info@`, `support@` type addresses only if better ones exist
- The `StatusBadge` component moves from AITools to SearchPanel
- No database migration needed — all fields already exist on the leads table

