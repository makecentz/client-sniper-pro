

## Plan: Editable User Data & Company Settings in Admin Modal

### What Changes

**1. Database Migration** — Add admin UPDATE/DELETE policies
- `company_settings`: admin UPDATE and DELETE policies
- `profiles`: admin UPDATE policy  
- `usage_tracking`: admin DELETE policy (to fully remove a user's data)
- `leads`: admin DELETE policy (to allow wiping user leads)

**2. `src/components/admin/UserDetailModal.tsx`** — Major expansion
- **Profile section**: Make `display_name` editable via Input
- **Company Settings section**: Convert all 6 fields (business_name, website_url, phone, email, website_dev_price, current_deal) from read-only text to editable Inputs/Textarea, with a "Save" button
- **Danger Zone section**: Add a "Delete User Data" button (with confirmation dialog) that wipes the user's leads, company settings, usage tracking, and profile — effectively removing all their data

**3. `src/pages/Admin.tsx`** — Wire new callbacks
- Add `onSaveCompany(userId, companyData)` handler that upserts to `company_settings`
- Add `onSaveProfile(userId, displayName)` handler that updates `profiles`
- Add `onDeleteUserData(userId)` handler that deletes from `leads`, `company_settings`, `usage_tracking`, and `profiles`
- Pass these as props to `UserDetailModal`

### Modal Layout (updated)

```text
┌─────────────────────────────────────┐
│ user@email.com  [Pro]               │
├─────────────────────────────────────┤
│ Profile                             │
│  Display Name: [___________] [Save] │
│  User ID: xxx   Joined: date       │
│  Last Active: date  Leads: 5       │
├─────────────────────────────────────┤
│ Usage & Quota (unchanged)           │
│  Plan / Leads Remaining / Searches  │
├─────────────────────────────────────┤
│ Company Settings                    │
│  Business Name: [________]          │
│  Website: [________]                │
│  Phone: [________]  Email: [______] │
│  Dev Price: [________]              │
│  Current Deal: [________________]   │
│  [Save Company Info]                │
├─────────────────────────────────────┤
│ Danger Zone                         │
│  [Delete All User Data]             │
└─────────────────────────────────────┘
```

### Scope
- 1 migration (4 new RLS policies)
- 2 files updated (UserDetailModal.tsx, Admin.tsx)

