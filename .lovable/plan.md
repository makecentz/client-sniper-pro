

## Plan: Enhanced Admin Dashboard with User Details & Stats

### Current State
The admin page shows: stat cards (total users, pro users, total leads, active today), a users table (email, plan, searches today, leads remaining, joined date), and webhook logs. Plan and leads are editable inline.

### What to Add

**1. Expandable User Detail Row / User Detail Modal**
- Click a user row to expand or open a modal showing:
  - **Profile info**: email, display name, joined date, user ID
  - **Usage stats**: plan, searches today, leads remaining, last search date
  - **Saved leads count** (query `leads` table filtered by user_id with count)
  - **Editable fields**: plan (dropdown), leads remaining (input), searches today (input reset)
  - **Company settings** (if set): business name, website, phone, email, dev price, current deal

**2. Enhanced Users Table Columns**
- Add "Last Active" column (from `last_search_date`)
- Add "Leads Saved" column (count per user from `leads` table)
- Add a search/filter input to filter users by email

**3. Additional Stats Cards**
- "Total Searches" — sum of all `searches_today`
- "Free Users" count (complement to Pro Users)

**4. User Actions**
- "Reset Searches" button per user (set `searches_today` to 0)
- "View Leads" — expand to see that user's saved leads count and list

### Technical Details

**Files changed**: `src/pages/Admin.tsx` only

**Data fetching additions**:
- Query `leads` grouped by `user_id` to get per-user lead counts: `supabase.from("leads").select("user_id")` then count client-side
- Query `company_settings` for all users: `supabase.from("company_settings").select("*")` (needs admin RLS policy)

**Database migration needed**:
- Add admin SELECT policy on `company_settings`: `has_role(auth.uid(), 'admin'::app_role)` so admin can view all company settings

**UI approach**:
- Use a Dialog/Sheet component for user detail view (click "View" button on any row)
- Inside the dialog: tabs or sections for Profile, Usage, Company Info
- All editable fields save inline via the existing `usage_tracking` update pattern
- Search input at top of users table with client-side filtering

### Scope
- 1 migration (admin RLS on company_settings)
- 1 file updated (Admin.tsx) — significant expansion with user detail modal, search filter, extra columns, and stats

