## Goal
Affiliate links should land visitors on the home page (not the signup page), and the affiliate code should follow them so they still get credited when they later sign up.

## Current behavior
- Affiliate dashboard generates links like `https://clienthunterai.com/signup?ref=CODE`.
- Tracking + cookie set only happens inside `Signup.tsx`, so any other landing target loses attribution.

## Changes

1. **`src/pages/dashboard/Affiliate.tsx`** — change the generated referral URL from `/signup?ref=CODE` to `/?ref=CODE` so the click lands on the home page.

2. **New global ref handler** — add a small `<ReferralTracker />` component mounted once inside `<BrowserRouter>` in `src/App.tsx`. On any route, if the URL has `?ref=CODE`, it calls `trackReferralClick(code)` (which sets the 30‑day `ch_ref` cookie and pings the edge function), then strips `ref` from the URL so it stays clean. This means the code is captured no matter where the affiliate link points (home, pricing anchor, etc.).

3. **`src/pages/Signup.tsx`** — no behavior change needed; it already reads `getReferralCookie()` as a fallback, so users who click the home‑page link and later navigate to signup will still be attributed via the cookie.

## Result
- Clicking an affiliate link → lands on `/` (home page).
- Cookie `ch_ref` holds the code for 30 days.
- When the visitor signs up later, `processReferralOnSignup()` picks up the cookie and credits the affiliate.
