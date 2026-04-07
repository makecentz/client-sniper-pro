

## Plan: Post-Signup Onboarding Form

### Summary
After a new user signs up and logs in for the first time, redirect them to an onboarding page that collects their company info (business name, website, phone, email, website dev price, current deal). On submit, upsert this into `company_settings` and redirect to the dashboard. Returning users skip it.

### How It Works
1. When a logged-in user navigates to `/dashboard`, check if they have a `company_settings` row
2. If not, redirect to `/onboarding`
3. The onboarding page shows a friendly multi-field form with the same fields as Settings > Company Information
4. On submit, upsert into `company_settings` and navigate to `/dashboard`

No database changes needed — `company_settings` table already exists with the right columns and RLS policies.

### Files Changed

**1. `src/pages/Onboarding.tsx`** (new)
- Full-page form collecting: business name, website URL, phone, email, website dev price, current deal/promotion
- Styled consistently with the app (dark theme, card layout, logo at top)
- Submit upserts to `company_settings` via Supabase client
- On success, navigates to `/dashboard`
- Skip button available (user can fill in later from settings)

**2. `src/components/ProtectedRoute.tsx`** (edit)
- After confirming user is authenticated, query `company_settings` for the user
- If no row exists and current path starts with `/dashboard`, redirect to `/onboarding`
- Cache the check in state so it only runs once per session

**3. `src/App.tsx`** (edit)
- Add `/onboarding` route wrapped in `ProtectedRoute` (but excluded from the onboarding redirect check to avoid a loop)
- Import the new `Onboarding` page

