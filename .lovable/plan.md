
## Goals

1. Business name no longer required during business onboarding.
2. Dedicated affiliate signup flow that collects the affiliate's personal info + I-9, restricted to United States.
3. Affiliate accounts skip the "Set Up Your Business" onboarding form.

## Changes

### 1. Onboarding — make business name optional
**File:** `src/pages/Onboarding.tsx`
- Remove `required` from the business_name input and drop the `*` from the label.
- Update copy to clarify it's optional.

### 2. Database — affiliate profile + I-9 storage
**New migration:**
- Create table `affiliate_profiles`:
  - `user_id uuid PK` (one row per user)
  - `first_name`, `last_name`, `email`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `zip`, `country` (must be `'US'`)
  - `payout_method` (`paypal` | `bank` | `check`), `payout_details` text
  - `i9_file_path text` (path inside storage), `i9_uploaded_at timestamptz`
  - `created_at`, `updated_at`
- RLS:
  - `SELECT/INSERT/UPDATE` where `auth.uid() = user_id`
  - Admins `SELECT/UPDATE` via `has_role`
- Add CHECK constraint on `country = 'US'` (rejected at DB level as a safety net).
- Create **private** storage bucket `affiliate-documents` with RLS:
  - Users can `INSERT/SELECT/UPDATE` objects whose first path segment equals their `auth.uid()`.
  - Admins (has_role admin) can `SELECT` all objects in this bucket.

### 3. Affiliate-specific signup page
**New file:** `src/pages/AffiliateSignup.tsx` at route `/affiliate-signup`
Flow:
- **Step 1 — Account:** email + password (uses `signup()` from `AuthContext`, same as `Signup.tsx`); also captures referral cookie if present.
- **Step 2 — Affiliate profile (after auth/email confirm):**
  - Country select (default United States). If user picks anything else → block submit and show: "Sorry, the ClientHunter affiliate program is currently only available to U.S. residents."
  - First name, last name, phone, full US address, state (US states dropdown), zip (5-digit validation).
  - Payout method + details.
  - I-9 file upload (`.pdf,.jpg,.jpeg,.png`, max 5 MB) → uploaded to `affiliate-documents/<user_id>/i9-<timestamp>.<ext>`.
  - On submit: upsert `affiliate_profiles`, mark `localStorage.onboarding_dismissed_<user_id> = "1"` and `affiliate_signup_<user_id> = "1"` so the business onboarding never appears, then `invoke("affiliate-create-link")` and redirect to `/dashboard/affiliate`.
- Validate inputs with `zod`.

**Update `src/pages/AffiliateProgram.tsx`:** "Become an Affiliate" CTA links to `/affiliate-signup` (not `/signup`). Add prominent "U.S. residents only — W-9/I-9 required for payouts." note.

**Update `src/App.tsx`:** register `/affiliate-signup` route.

### 4. Skip business onboarding for affiliates
**File:** `src/pages/Onboarding.tsx`
- On mount, also check `localStorage.affiliate_signup_<user_id>`; if set, redirect to `/dashboard/affiliate`.
- Backend fallback: if a row exists in `affiliate_profiles` for the user, treat as affiliate and redirect.

### 5. Affiliate dashboard — show profile + I-9 status
**File:** `src/pages/dashboard/Affiliate.tsx`
- Fetch `affiliate_profiles`. If missing for users who arrived via Google OAuth (skipped the form), show a banner: "Complete your affiliate profile" linking to a small inline form (same fields as Step 2) so they can upload I-9 later.
- Show I-9 status badge: "On file" / "Missing — required before payout".
- Block "Request Payout" button if I-9 missing; show tooltip explaining why.

### 6. Admin view (small addition)
**File:** `src/components/admin/AdminAffiliates.tsx`
- Add a "Profile" column / drawer showing the affiliate's name, address, and a signed-URL link to download the I-9 (admin-only via storage RLS).

## Technical details

- Storage upload uses `supabase.storage.from("affiliate-documents").upload(path, file, { upsert: true })`.
- I-9 download for admins via `createSignedUrl(path, 60)`.
- US states: hardcoded array of 50 states + DC in a small constant.
- Email validation already handled by Supabase auth; `zod` schemas enforce length limits (per project's input-validation guidance).
- No changes needed to `affiliate-process-signup` edge function — it already runs on user signup regardless of which signup form was used.

## Out of scope

- Tax form generation (W-9 vs I-9 distinction): the user asked specifically for "I-9", so we collect that file. We can revisit W-9 later if needed.
- International affiliate support.
