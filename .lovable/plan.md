## Add "Continue with Google" to Login & Signup

Google is already enabled as a managed OAuth provider (set up when we added Connect/Disconnect in Settings). This task adds a Google button to the public auth pages so new and returning users can choose Google instead of email/password.

### What the user sees

On both **Signup** (`/signup`) and **Login** (`/login`):

```text
[ Continue with Google ]
─────── or ───────
Email    [____________]
Password [____________]
[ Create Account / Sign In ]
```

- The Google button is full-width, outlined, with the official multi-color G icon.
- A thin "or" divider separates it from the email/password form.
- Clicking it redirects through Google's consent screen, then back to `/dashboard`.
- If the user cancels or Google returns an error, a toast explains and the form remains usable.
- On the Signup page, the button is hidden in the post-submit "Check your email" view (no longer relevant once they've submitted).

### Files touched

- **New** `src/components/GoogleAuthButton.tsx` — reusable button + thin "or" divider, wraps `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" })`. Handles the three result cases: `error` (toast), `redirected` (do nothing, browser is leaving), tokens-returned (navigate to `/dashboard`).
- **Edit** `src/pages/Signup.tsx` — render `<GoogleAuthButton />` + `<AuthDivider />` above the email/password form.
- **Edit** `src/pages/Login.tsx` — same insertion above the existing form.

### Out of scope

- No backend changes — Google provider is already configured with managed credentials.
- No changes to `AuthContext` — the existing `onAuthStateChange` listener picks up the OAuth session automatically on redirect back.
- No changes to the Settings "Connected Accounts" card (already built).
- No Apple / GitHub / other providers.

### Edge cases handled

- User already signed in and lands on `/login` or `/signup` → existing redirect to `/dashboard` still applies.
- Google account email matches an existing email/password user → Supabase auto-links by email (managed behavior); user lands in dashboard.
- User cancels Google consent → returned with an error param; toast shown.
