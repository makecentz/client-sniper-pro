## Goal
Change the Pro plan price to **$25/month** everywhere — Stripe, frontend copy, checkout, and admin defaults.

## Stripe changes
The current Pro price (`price_1TOyHSIEsTwcnIOwGpAkXs8j`) is $49 in Stripe (product `prod_UHSfSAAJLpI9AT`). Stripe prices are immutable, so:
1. Create a new recurring monthly price of **$25 USD** on the existing Pro product `prod_UHSfSAAJLpI9AT` (nickname: "Pro Monthly $25").
2. Archive the old $49 price so it can't be used for new checkouts.

The new price ID will replace every hardcoded reference to `price_1TOyHSIEsTwcnIOwGpAkXs8j`.

## Code changes

**`supabase/functions/create-checkout/index.ts`**
- Replace `PRO_SUBSCRIPTION_PRICE` constant with the new $25 price ID.

**`supabase/functions/stripe-webhook/index.ts`**
- Update the `pro_price_monthly` fallback default from `49` to `25` (line ~99).

**`src/pages/dashboard/DashboardSettings.tsx`**
- Update `STRIPE_PRICES.pro.price_id` to the new $25 price ID.
- Replace displayed copy: `$69/mo` → `$25/mo`, strike-through `$89/mo` → removed (no longer a "limited time" discount since $25 is the new regular price), button label `Upgrade to Pro — $69/mo` → `Upgrade to Pro — $25/mo`, and the "Regular price $89/mo — locked in" line removed.

**`src/pages/Landing.tsx`** (Pricing section, ~line 299–316)
- Change the Pro card: `$69` → `$25`, remove the strike-through `$89` and "Limited time only — regular price $89/mo" line.

**`src/pages/Admin.tsx`**
- Change initial state defaults `useState(69)` / `useState("69")` → `25` / `"25"`.

**`admin_settings` table (data migration)**
- Update the row where `key = 'pro_price_monthly'` to `value = '25'` so the live admin-configurable price matches.

## Out of scope
- No change to the Lead Pack ($10 one-time) price or product.
- No change to free-tier limits, search quotas, or feature gating.
- No layout/visual redesign of the pricing card beyond removing the strike-through discount line.
