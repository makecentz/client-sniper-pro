When a user has filled in every onboarding field except **Current Deal / Promotion**, the app should treat onboarding as complete and stop interrupting them with the onboarding page or the progress banner on the dashboard.

## What we will change

### 1. Onboarding page (`src/pages/Onboarding.tsx`)
- After the form prefills from existing `company_settings`, check whether all required fields have values.
- Required fields: `first_name`, `last_name`, `business_name`, `website_url`, `phone`, `email`, `website_dev_price`.
- Optional field: `current_deal`.
- If every required field is non-empty, auto-redirect the user to `/dashboard` so they never see the onboarding form again.

### 2. Dashboard onboarding banner (`src/components/OnboardingProgress.tsx`)
- Add `first_name` and `last_name` to the tracked setup steps (they are already in the form and database but missing from the progress card).
- Remove `current_deal` from the tracked steps so it no longer blocks the banner from disappearing.
- Update the Supabase select query to include `first_name` and `last_name`.
- The banner will now only appear when one of the 7 required fields is still empty. Once all required fields are filled — even if `current_deal` is blank — the banner hides automatically.

## What we will NOT change
- `ProtectedRoute` already allows dashboard access as long as a `company_settings` row exists. No redirect logic change is needed there.
- The `search-businesses` edge function only blocks searches when no `company_settings` row exists at all. That behavior stays the same.
- No database migrations are required; `first_name` and `last_name` columns already exist from the previous update.

## Result
- Users who complete every field except Current Deal will land directly on the dashboard after login and will not see the "Finish setting up your account" progress card.