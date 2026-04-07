

## Fix: Onboarding Keeps Reappearing After Completion

### Root Cause
The `ProtectedRoute` effect that checks `company_settings` depends on `[user]` — the entire user object. Every time the user object reference changes (subscription checks every 60s, lead count refreshes, etc.), the effect re-runs, resets `onboardingChecked` to `false`, and briefly sets `hasSettings` back to its default `false`. This causes a redirect flash back to `/onboarding` even though the data exists in the database.

### Fix

**`src/components/ProtectedRoute.tsx`**
1. Change the effect dependency from `[user]` to `[user?.id]` — only re-check when the actual user identity changes, not on metadata updates
2. Once `hasSettings` is set to `true`, don't reset it on subsequent effect runs — use a functional check: only query if we haven't already confirmed settings exist

This is a one-file, ~5-line change.

