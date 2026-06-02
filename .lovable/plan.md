## Goal

1. Make the free tier a **one-time lifetime allowance** of 2 searches (not daily). After that, free users hit a paywall.
2. Force **onboarding completion** before any search can run (so we always capture user data first).
3. Require **email verification** for email/password signups (Google stays auto-verified).

---

## 1. Lifetime free quota (2 searches, no daily reset)

**Database** — add a counter that never resets:
- Add `lifetime_searches_used INTEGER NOT NULL DEFAULT 0` to `usage_tracking`.
- Backfill from current `searches_today` so existing free users don't suddenly get a fresh 2.

**Edge function `search-businesses`**:
- For `plan === 'free'`: check `lifetime_searches_used >= 2` → return `LIMIT_REACHED` with code `FREE_LIMIT_REACHED`.
- For `plan === 'pro'`: keep existing daily 50-search logic untouched.
- On every successful search, increment `lifetime_searches_used` (in addition to existing `searches_today` bookkeeping).

**Frontend `SearchPanel.tsx`**:
- When the API returns `FREE_LIMIT_REACHED`, open the existing `UpgradeModal` / payment screen with a message like "You've used your 2 free searches. Choose a plan to keep going."
- Update the "searches left today" UI for free users to read **"X of 2 free searches used"** (lifetime, not daily).

**`AuthContext.tsx`**: expose `lifetime_searches_used` on the user object so the UI can render the lifetime counter.

---

## 2. Onboarding gate before any search

`ProtectedRoute` already redirects to `/onboarding` when `company_settings` is missing **unless the user dismissed it**. To make onboarding mandatory:
- Remove the `onboarding_dismissed_<userId>` localStorage escape hatch.
- Also remove the "Skip" button from `Onboarding.tsx` if present.
- Add a server-side safety net: `search-businesses` checks `company_settings` exists for the user and returns `ONBOARDING_REQUIRED` if not — frontend redirects to `/onboarding`.

Result: new users land on `/onboarding`, fill it out, and only then can they reach the dashboard/search.

---

## 3. Email verification for email signups

**Auth config**: turn OFF auto-confirm so Supabase requires email verification for password signups. Google OAuth users remain verified automatically.

**`signup-with-ip-check` edge function**:
- Change `email_confirm: false` → keep as is (already false). The user is created unconfirmed.
- After successful creation, call `supabase.auth.admin.generateLink({ type: 'signup' })` (or rely on the default Supabase confirmation email) — Lovable's auth email pipeline will send the branded confirmation email.
- Return `{ success: true, requires_verification: true }`.

**Frontend `Signup.tsx` / `AuthContext.signup`**:
- After calling `signup-with-ip-check`, do NOT auto-log-in. Instead show a "Check your email to verify your account" screen.
- On `Login.tsx`, if `signInWithPassword` returns "Email not confirmed", show a clear message + a "Resend verification email" button.

**Auth email template**: ensure the confirm-signup template exists (already scaffolded under `supabase/functions/_shared/email-templates/signup.tsx`) and `auth-email-hook` is deployed — no change needed if already set up.

---

## Files to change

- `supabase/migrations/<new>.sql` — add `lifetime_searches_used` column + backfill.
- `supabase/functions/search-businesses/index.ts` — lifetime check, onboarding check, increment counter.
- `supabase/functions/signup-with-ip-check/index.ts` — return `requires_verification` flag.
- `src/contexts/AuthContext.tsx` — expose lifetime counter; update `signup()` to not auto-login; surface "email not confirmed" error in `login()`.
- `src/pages/Signup.tsx` — show "verify your email" confirmation step.
- `src/pages/Login.tsx` — handle unverified-email state + resend link.
- `src/pages/dashboard/SearchPanel.tsx` — new copy, new modal trigger for `FREE_LIMIT_REACHED`.
- `src/components/ProtectedRoute.tsx` — remove the onboarding-dismiss escape hatch.
- `src/pages/Onboarding.tsx` — remove any "Skip" option.
- Supabase auth config — disable auto-confirm email.

---

## Open questions

1. **Existing free users**: should users who already burned ≥2 searches today be immediately paywalled, or grandfathered with their current allowance? (Default: paywall immediately — that's the cleanest enforcement.)
2. **Email verification for users created before this change**: leave them as-is (already confirmed)? (Default: yes.)
