
# Phase 2: Live Search & Real Data

## 1. Add API Secrets
- Request `OUTSCRAPER_API_KEY` and `SCREENSHOTONE_API_KEY` secrets

## 2. Edge Function: `search-businesses`
- Accepts city, state, business_type from frontend
- Calls Outscraper API to find businesses
- Returns scored results (hot = no website or bad website, needs_upgrade = has decent site)
- Validates input, checks user usage limits

## 3. Edge Function: `capture-screenshot`
- Accepts a website URL
- Calls ScreenshotOne API to capture a screenshot
- Returns the screenshot URL

## 4. Wire SearchPanel to real API
- Replace mock search with `supabase.functions.invoke('search-businesses')`
- Display real results with screenshot previews
- "Save Lead" button saves to `leads` table in Supabase
- Update usage_tracking (decrement leads_remaining, increment searches_today)

## 5. Wire SavedLeads to Supabase
- Fetch leads from `leads` table instead of mock data
- CRUD operations (update notes, toggle contacted, delete) via Supabase
- CSV export from real data

## 6. Wire AITools to Supabase
- Save generated messages to `messages` table
- Save generated offers to `offers` table
- Load saved leads for the lead selector
