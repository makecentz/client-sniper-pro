

## Plan: Phase 2 & 3 — Addictive + Elite Features for ClientHunter AI

This is a large feature set. I'll implement it incrementally across multiple steps.

### Database Changes (Single Migration)

Add new columns to `leads` table:
- `priority_score` (integer, default 0)
- `priority_label` (text, default 'low')
- `ai_insight` (text, nullable)
- `status` (text, default 'new') — values: new, contacted, followed_up, closed, lost
- `follow_up_date` (date, nullable)
- `competitor_insight` (text, nullable)

Create new tables:
- `proposals` — id, user_id, lead_id, content, pdf_url, created_at (RLS: user owns)
- `dfy_requests` — id, user_id, lead_id, notes, status (default 'pending'), created_at (RLS: user owns + admin read)

### Edge Function Changes

**1. Update `generate-outreach/index.ts`** — add new prompt types:
- `video_script` — 15-30 second TikTok/Instagram pitch script
- `call_script` — opening, questions, objection handling, closing
- `proposal` — full proposal content with problems found, solution, pricing
- `why_this_lead` — 1-3 bullet points explaining opportunity (stored as `ai_insight`)
- `competitor_insight` — competitive analysis summary

**2. Update `search-businesses/index.ts`** — compute `priority_score` (1-100) and `priority_label` during search based on: no website (+40), website issues (+15 each), high reviews but weak site (+20). Return these with results.

### Frontend Changes

**1. New Dashboard Home page** (`src/pages/dashboard/DashboardHome.tsx`)
- "🔥 Top Leads Today" — top 5 leads by priority_score
- "Follow-Up Reminders" — leads with follow_up_date <= today
- Quick stats (total leads, contacted, pending follow-ups)
- Route: `/dashboard` (move SearchPanel to `/dashboard/search`)

**2. Update `SavedLeads.tsx`**
- Add status dropdown per lead (New/Contacted/Followed Up/Closed/Lost)
- Add "Set Follow-Up" button with 1/2/3 day options (popover)
- Add priority score badge and label
- Add "Why This Lead?" button → calls AI, shows/stores `ai_insight`
- Add "Find Competitors" button → calls AI, shows/stores `competitor_insight`
- Filter by status

**3. Update `AITools.tsx`**
- Add "Generate Proposal" card
- Add "Video Pitch Script" card
- Add "Call Script" card
- Add "Done For You" CTA button → opens form, submits to `dfy_requests`

**4. Update `DashboardSidebar.tsx`**
- Add "Dashboard" nav item (home icon) pointing to `/dashboard`
- Rename search route

**5. Update `App.tsx`** — add new routes

**6. Update `mock-data.ts`** — extend Lead interface with new fields

### Technical Details

- Priority scoring logic runs in the edge function during search and is saved with the lead
- "Why This Lead?" and "Competitor Insight" use the existing `generate-outreach` function with new prompt types, stored on the lead record
- Proposal PDF generation uses the AI gateway to generate content, then a client-side PDF download (html-to-text style, no server-side PDF library needed)
- Follow-up reminders are date-based queries, no cron needed — just filter on dashboard load
- DFY requests table has admin RLS policy so admin page can view all requests

### Files to Create/Modify

1. **Migration** — new columns + new tables
2. `src/pages/dashboard/DashboardHome.tsx` — new dashboard home
3. `src/pages/dashboard/SavedLeads.tsx` — status, follow-ups, AI insight, competitors
4. `src/pages/dashboard/AITools.tsx` — proposal, video script, call script, DFY
5. `src/lib/mock-data.ts` — updated interfaces
6. `src/App.tsx` — new routes
7. `src/components/DashboardSidebar.tsx` — updated nav
8. `supabase/functions/generate-outreach/index.ts` — new prompt types
9. `supabase/functions/search-businesses/index.ts` — priority scoring

