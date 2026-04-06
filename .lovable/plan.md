

## Plan: Mini CRM Lead Detail Modal

### Summary
Add a lead detail modal to the Saved Leads page that acts as a mini CRM — view, edit, manage status, add timestamped notes, and generate AI content, all without leaving the page.

### Database Changes (Migration)

**1. Add columns to `leads` table:**
- `category` (text, nullable)
- `city` (text, nullable)
- `state` (text, nullable)
- `zip` (text, nullable)
- `contact_name` (text, nullable)
- `last_contacted_at` (timestamptz, nullable)
- `tags` (text[], default '{}')

**2. Create `lead_notes` table:**
- `id` (uuid, PK)
- `lead_id` (uuid, not null)
- `user_id` (uuid, not null)
- `content` (text, not null)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

RLS policies: users can CRUD their own notes (matched by `user_id`). Add `updated_at` trigger.

### Frontend Changes

**1. Update `src/lib/mock-data.ts`** — add new fields to `Lead` interface: `category`, `city`, `state`, `zip`, `contact_name`, `last_contacted_at`, `tags`.

**2. Create `src/components/LeadDetailModal.tsx`** — the main modal component:
- Uses Dialog component, opens when a lead is clicked
- Tabbed layout with 4 tabs: **Overview**, **Details**, **Notes**, **AI Content**

**Overview tab:**
- Read-only display of business name, phone, address, website, email, score, priority, status, contacted, created date, website issue badges, screenshot
- Quick action buttons: Mark Contacted, Mark Followed Up, Mark Closed, Mark Lost, Set Follow-up

**Details tab:**
- Editable form fields: business_name, phone, address, website, category, city, state, zip, email, contact_name, tags (comma-separated input)
- Save Changes / Cancel buttons
- Updates lead in Supabase on save

**Notes tab:**
- Timeline of timestamped note entries from `lead_notes` table
- "Add Note" input + button at top
- Each note shows content, created date, edit/delete buttons
- Edit inline, delete with confirmation

**AI Content tab:**
- Show existing: ai_insight, competitor_insight, ai_audit
- Show related messages/offers from `messages` and `offers` tables
- Buttons to generate: Email, DM, SMS, Proposal, Audit, Video Script, Call Script, Follow-ups (calls existing `generate-outreach` edge function)
- Generated content displays inline with copy button

**3. Update `src/pages/dashboard/SavedLeads.tsx`:**
- Add state for selected lead modal
- Make each lead card clickable (opens modal)
- Add "View" button to each card
- Pass `onLeadUpdated` callback to modal to refresh local state after edits

**4. Update `src/pages/dashboard/DashboardHome.tsx`:**
- Make top leads clickable to open the same modal

### Technical Details
- Modal uses existing shadcn Dialog + Tabs components
- Notes fetched via `supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false })`
- Tags stored as text array, displayed as badges, edited as comma-separated input
- `last_contacted_at` auto-set when status changes to "contacted"
- All existing RLS patterns followed (user_id = auth.uid())
- The `mapLead` helper updated to include new fields with defaults

### Files Changed
1. New migration — add columns + create `lead_notes` table
2. `src/lib/mock-data.ts` — updated Lead interface
3. `src/components/LeadDetailModal.tsx` — new component (~400 lines)
4. `src/pages/dashboard/SavedLeads.tsx` — add modal trigger
5. `src/pages/dashboard/DashboardHome.tsx` — add modal trigger

