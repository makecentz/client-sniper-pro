

## Plan: Pro Plan — 200 Saved Leads Cap

### Summary
Cap pro users at 200 saved leads. Show a warning at 150, block saving/searching at 200, and display a saved leads counter in the sidebar.

### How It Works
- The leads count is fetched from the `leads` table (count query) and stored in the `User` context object
- Sidebar shows "Saved Leads: X/200" in the Usage section
- At 150+ leads, a toast warning fires when saving: "You have X/200 leads — start deleting old ones"
- At 200 leads, the Save button is disabled and search is blocked with a message
- After deleting leads, the count refreshes so the user can resume

### Files Changed

**1. `src/contexts/AuthContext.tsx`**
- Add `saved_leads_count` to the `User` interface
- In `mapSupabaseUser`, query `leads` table with `count` to populate it
- Add a `refreshLeadCount` function exposed on context so components can trigger a recount after save/delete

**2. `src/components/DashboardSidebar.tsx`**
- Add a "Saved Leads" row in the Usage section showing `{user.saved_leads_count}/200`
- Color it yellow/warning when >= 150, red when at 200

**3. `src/pages/dashboard/SearchPanel.tsx`**
- Before `handleSearch`: if `saved_leads_count >= 200`, show toast error and return early
- Before `handleSaveLead`: if `saved_leads_count >= 200`, block with toast; if >= 150, show warning toast
- After successful save, call `refreshLeadCount()`
- Disable search/save buttons visually when at 200, with tooltip explaining why

**4. `src/pages/dashboard/SavedLeads.tsx`**
- After successful delete, call `refreshLeadCount()` to update the counter

**5. `src/pages/dashboard/DashboardHome.tsx`**
- No changes needed — it already reads from context

### Constants
- `PRO_LEADS_LIMIT = 200`
- `PRO_LEADS_WARNING = 150`
- Free plan keeps the existing `leads_remaining` system unchanged

