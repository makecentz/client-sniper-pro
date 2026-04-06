

## Plan: Manual Website URL Input on AI Tools Page

### What This Does
Adds a section below the lead selector on the AI Tools page where users can manually enter a website URL for businesses that have a site but need upgrades. When they click "Get Info", the app will:
1. Run the website through the same checks used during search (SSL, mobile-friendly, copyright, errors)
2. Display the business info and detected issues below the input
3. Save/update the website URL on the selected lead in the database
4. Allow the AI tools to use this new website data for generating content

### Changes

**1. Update `AITools.tsx`**
- Add a new Card section between the lead selector and the tool grid
- Contains: URL input field + "Get Info" button
- On submit: calls a new edge function `analyze-website` that runs the same `checkWebsite` logic from `search-businesses`
- Displays results: website status, SSL, mobile-friendly, copyright, issues list
- Updates the selected lead's `website`, `has_website`, and issue flags in the DB
- Also updates the local `leads` state so AI tools immediately use the new data
- If no lead is selected, creates a new lead with the business name derived from the URL domain and saves it

**2. Create edge function `supabase/functions/analyze-website/index.ts`**
- Accepts `{ url, lead_id? }` in the body
- Runs the same website checks (SSL, fetch for errors, viewport meta tag, copyright year)
- Returns `{ has_website, website_error, no_ssl, not_mobile_friendly, outdated_copyright, website_issues }`
- If `lead_id` is provided, updates that lead's website fields using service role client
- If no `lead_id`, inserts a new lead record with the URL and detected issues, returns the new lead ID

**3. UI Flow**
- User selects a lead (or leaves empty for a new one)
- Enters website URL, clicks "Get Info"
- Results appear: green/red badges for each check
- Lead is updated/created in DB and local state
- User can now use all AI tools with the enriched website data

### Technical Details
- The `checkWebsite` logic is duplicated from `search-businesses` into the new function (keeps functions self-contained)
- New lead creation uses `user_id` from auth, sets `has_website: true`, `score: "needs_upgrade"`
- The manual URL input card uses the same styling as existing cards
- No database migration needed — all fields already exist on the leads table

