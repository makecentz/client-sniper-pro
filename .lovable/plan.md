## Goal
Prevent users from creating multiple free accounts from the same IP address. Record signup IP and most recent IP, surface them in the admin user detail view, and block duplicate signups with a clear message.

## How it works

1. **Signup is gated through an edge function** instead of calling `supabase.auth.signUp` directly from the browser.
   - The function reads the caller's IP from request headers (`x-forwarded-for`, falling back to `cf-connecting-ip`).
   - It checks the `profiles` table for an existing `signup_ip` match.
   - If a match exists: return 409 with message: *"An account already exists for this IP address. Please contact the existing account holder — only one account is allowed per IP."*
   - If no match: create the user via the service-role admin API, store `signup_ip` and `last_ip` on the new profile.

2. **Login also records the latest IP** via a lightweight edge function called right after a successful `signInWithPassword`. This updates `last_ip` and `last_ip_at` on the profile. (Login itself is not blocked — only signup is restricted, matching the user's intent of "preventing multiple free accounts.")

3. **Admin dashboard** shows both `signup_ip` and `last_ip` (with timestamp) inside `UserDetailModal`, plus a small "IP" column hint. Admins can still create accounts via the existing admin invite flow without the IP check.

## Database changes (migration)

Add to `public.profiles`:
- `signup_ip text` (nullable, indexed)
- `last_ip text` (nullable)
- `last_ip_at timestamptz` (nullable)

Index: `CREATE INDEX idx_profiles_signup_ip ON public.profiles(signup_ip);`

No new tables, no RLS changes needed (profiles RLS already restricts to owner + admin).

## Edge functions

- **`signup-with-ip-check`** (new, `verify_jwt = false`)
  - Input: `{ email, password, display_name? }`
  - Extracts IP from headers
  - Queries `profiles` for existing `signup_ip`; if found → 409
  - Calls `supabase.auth.admin.createUser({ email, password, email_confirm: false })`
  - Updates the auto-created profile row with `signup_ip` and `last_ip`
  - Returns success; client then calls `signInWithPassword` (or asks user to verify email if confirmation is on)

- **`record-login-ip`** (new, `verify_jwt = true`)
  - Called after successful login
  - Updates `last_ip` / `last_ip_at` on the calling user's profile using service role

## Frontend changes

- `src/contexts/AuthContext.tsx` — `signup()` now invokes `signup-with-ip-check`, surfaces the 409 message verbatim to the UI. `login()` fires `record-login-ip` after success (non-blocking).
- `src/pages/Signup.tsx` — display server error message (already shows thrown errors via toast).
- `src/components/admin/UserDetailModal.tsx` — add a small "Network" section displaying Signup IP and Last IP (+ relative time).
- `src/pages/Admin.tsx` — include `signup_ip`, `last_ip`, `last_ip_at` in the profile select so the modal receives them.

## Not included
- No bypass list / whitelist for shared IPs (offices, dorms). If you want an admin override list later, that's a follow-up.
- Google OAuth signups are not currently enabled in the project, so only email/password signup is gated. If Google login is added later, it would need the same IP check via an auth hook.
- IPv6 is stored as-is (no normalization).

## Files touched
- migration: add 3 columns + index on `profiles`
- new: `supabase/functions/signup-with-ip-check/index.ts`
- new: `supabase/functions/record-login-ip/index.ts`
- edit: `src/contexts/AuthContext.tsx`
- edit: `src/components/admin/UserDetailModal.tsx`
- edit: `src/pages/Admin.tsx` (select extra columns)
