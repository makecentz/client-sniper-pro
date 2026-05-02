# Lovable.dev Website Prompt Generator (Pro)

A new premium action in the **AI Content** tab of the lead detail modal that turns a saved lead's Google Maps listing into a ready-to-paste prompt for Lovable.dev. The user can copy it, drop it into Lovable, and instantly have a demo website to show the prospect.

## What the user sees

In the AI Content tab (in `LeadDetailModal.tsx`), directly below the "Open Offer Builder" button, add a new highlighted card:

- **Title:** "Build Demo Website Prompt"
- **Sub-label:** "Pro feature — generates a Lovable.dev prompt using their Google listing + photos so you can build a demo site to pitch."
- **Primary button:** `Generate Lovable.dev Prompt` (with a Wand/Sparkles icon)
- A small **PRO** badge in the corner.

Behavior by plan:
- **Free users:** button is disabled with a tooltip "Upgrade to Pro to unlock" and a small "Upgrade" link routing to billing/settings.
- **Pro users:** clicking calls a new edge function, then shows the result in an editable `Textarea` with a **Copy** button and an **Open Lovable.dev** link (`https://lovable.dev/?prompt=...`) that pre-fills the prompt.

The generated prompt block also lists the Google photos it pulled (small thumbnail row) so the user can confirm the source material.

## What gets included in the prompt

The prompt is structured for Lovable.dev to scaffold a small marketing site:

- Business name, category, address, city/state/zip
- Phone, email, website (if any), hours (if available)
- Rating + review count, a few representative review snippets (if available)
- 3–8 photo URLs from the Google listing (hero + gallery)
- Suggested page structure (Hero, About, Services, Gallery, Reviews, Contact + map embed)
- Brand tone hint inferred from category (e.g. "modern, trustworthy" for HVAC)
- Explicit instructions: use the photos as gallery/hero, embed the address in a map, list real contact info, add a contact form

## Technical plan

### 1. New edge function `generate-website-prompt`
- Auth required (JWT verified, same pattern as `generate-outreach`).
- **Pro gate:** look up the user's plan via the existing usage/subscription table used by `check-subscription`; return 403 with `{ error: "Pro plan required" }` if not pro.
- Body: `{ lead_id }`. Loads the lead row server-side (don't trust client).
- Calls Outscraper Google Maps "Place Photos" / Place details endpoint using `OUTSCRAPER_API_KEY` (already configured) keyed by the lead's `google_id`/`place_id` if present, otherwise by name + address. Caches the result on the lead row (new columns below) so repeat clicks are free.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`, no streaming) with a system prompt that asks it to write the final Lovable.dev build prompt as Markdown, embedding the photo URLs and business facts.
- Returns `{ prompt, photos: string[], cached: boolean }`.

### 2. Database (one migration)
Add nullable columns to `leads` to cache the listing data so we don't re-hit Outscraper:
- `gmaps_photos text[]`
- `gmaps_place_id text`
- `gmaps_hours jsonb`
- `gmaps_reviews jsonb`
- `website_prompt text`
- `website_prompt_generated_at timestamptz`

No RLS changes needed (existing lead policies cover it).

### 3. Frontend changes (`src/components/LeadDetailModal.tsx`)
- Read `plan` from `useAuth()`; treat `plan === "pro"` as unlocked.
- Add a new section in the `<TabsContent value="ai">` block above "Generate New Content".
- New state: `websitePrompt`, `websitePromptPhotos`, `generatingPrompt`.
- Handler `generateWebsitePrompt()` invokes the new edge function, sets state, toasts on error (handle 402/429/403 like other generators).
- Render the result in an editable Textarea + Copy button + "Open in Lovable.dev" anchor.
- If `lead.website_prompt` already exists on load, pre-populate the Textarea.

### 4. UX details
- Use the same `Card` / button styling as the existing "Open Offer Builder" CTA so it feels native.
- Show a small loading skeleton while generating (Outscraper + AI can take ~5–10s).
- After generation, surface the photo thumbnails in a horizontal scroll row.

## Out of scope
- Actually building the site inside the app (the user takes the prompt to Lovable.dev themselves).
- Editing/curating which photos to include — v1 just uses the top 8 from Google.

## Files touched
- `supabase/functions/generate-website-prompt/index.ts` (new)
- `supabase/config.toml` (register function — uses default JWT verification)
- New migration adding the cache columns to `leads`
- `src/components/LeadDetailModal.tsx` (UI + handler)
