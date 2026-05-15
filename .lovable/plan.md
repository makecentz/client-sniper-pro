# Better User Management

## 1. Database changes (migration)

Add to `usage_tracking`:
- `frozen` boolean, default `false`
- `admin_message` text, nullable (message shown at top of user's dashboard)
- `admin_message_at` timestamptz, nullable

RLS: extend "Users can view own usage" so users can read their own `frozen` + `admin_message`. Admins already have full update.

## 2. Add Users (invite flow)

New edge function `admin-invite-user` (verify_jwt + admin role check via `has_role`):
- Input: `email`, `plan` ("free" | "pro")
- Uses service role to call `auth.admin.inviteUserByEmail(email)` — sends Supabase invite email so user sets their own password
- After invite, ensures `usage_tracking` row exists with selected plan/leads (the `handle_new_user` trigger handles this on first sign-in, so the function just records intent in `admin_settings` or waits)

Admin UI: "Add User" button next to Search/Export → dialog with Email + Plan. On submit, calls the function and shows toast.

## 3. Freeze accounts

- Add Freeze/Unfreeze toggle in `UserDetailModal` (writes `frozen` to `usage_tracking`)
- Add a small frozen badge in the Users table row
- In `ProtectedRoute` (or `DashboardLayout`), fetch current user's `usage_tracking.frozen`. If frozen, render a full-screen "Account frozen — contact support" page instead of dashboard children

## 4. Dashboard message banner

- In `UserDetailModal`, add textarea "Send message to user dashboard" + Save / Clear buttons (writes `admin_message` + `admin_message_at`)
- New `<DashboardMessageBanner />` rendered at top of `DashboardLayout`. Reads current user's `usage_tracking.admin_message`. If non-empty, shows a dismissible amber banner: "Message from support: {text}". Dismiss = local sessionStorage (so it reappears next session until admin clears it)

## 5. Scrollable lists

- Wrap the Users table body in a `max-h` container sized to ~6 rows with `overflow-y-auto`. Keep `<TableHeader>` outside the scroll container (sticky) so headers stay visible
- Same treatment for Recent Webhook Events at ~5 rows

Approx row height 56px → users `max-h-[22rem]`, webhooks `max-h-[19rem]`. Tune after visual check.

## Files

- New migration: add columns + RLS update
- New edge function: `supabase/functions/admin-invite-user/index.ts` (+ `supabase/config.toml` entry if needed)
- New: `src/components/DashboardMessageBanner.tsx`
- New: `src/components/admin/AddUserDialog.tsx`
- Edit: `src/pages/Admin.tsx` — Add User button, scrollable wrappers
- Edit: `src/components/admin/UserDetailModal.tsx` — freeze toggle + message editor (props extended)
- Edit: `src/components/DashboardLayout.tsx` — mount banner
- Edit: `src/components/ProtectedRoute.tsx` — frozen-account gate

## Notes / questions

- Invites use Supabase's built-in invite email (sender = your configured auth email). OK?
- Frozen users are blocked from the dashboard but can still log in to see the "frozen" screen. OK?
