

## Plan: Logo Link, Nav Auth State, and Session Persistence

### Changes

**1. `src/components/DashboardSidebar.tsx`** — Make logo clickable to home
- Wrap the logo (`Zap` icon + "ClientHunter" text) in a `<Link to="/">` so clicking it navigates to the landing page without logging out

**2. `src/pages/Landing.tsx`** — Show "My Account" instead of "Get Started" when logged in
- Import `useAuth` and check if `user` is present
- When logged in: replace the "Get Started" button with a "My Account" button linking to `/dashboard`
- Keep "Log In" hidden too when already authenticated (or replace with "Dashboard")

**3. Session persistence** — Already handled
- Supabase auth uses `localStorage` by default, which persists across browser sessions. No change needed here — users stay logged in until they explicitly log out. If the current config overrides this, I'll verify and fix in `AuthContext.tsx`.

### Scope
Three small UI tweaks across two files. No backend changes.

