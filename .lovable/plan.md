

## Change Pro Subscription Price from $29 → $49

### What changes

**1. Stripe (new price required)**
Stripe prices are immutable. I'll create a **new recurring price of $49/month** on the existing Pro product (`prod_UHSfSAAJLpI9AT`) using the Stripe tool, then swap the price ID throughout the code. The old $29 price will be left in Stripe (existing subscribers stay on it until they re-checkout) — new checkouts will use the $49 price.

**2. Code updates**

| File | Change |
|------|--------|
| `src/pages/dashboard/DashboardSettings.tsx` | Update `STRIPE_PRICES.pro.price_id` to new ID. Change copy `$29/month` → `$49/month` and button label `Upgrade to Pro — $29/mo` → `$49/mo` |
| `src/pages/Landing.tsx` | Pricing card: `$29` → `$49` |
| `supabase/functions/create-checkout/index.ts` | Update the hardcoded subscription price ID check on line 41 to the new price ID |
| `src/pages/Admin.tsx` | Seed the `admin_settings.pro_price_monthly` value to `49` if it's currently `29` (so the admin Revenue Analytics MRR calculations match). The admin slider already defaults to 49 in `RevenueAnalytics.tsx` — no change needed there. |

**3. Database**
Run a one-line update so the admin setting reflects the new price:
```sql
UPDATE admin_settings SET value = '49' WHERE key = 'pro_price_monthly';
```

### What is NOT changing
- Existing active Stripe subscribers remain billed at $29 until they cancel/re-subscribe (standard Stripe behavior). If you want to migrate them to $49, that's a separate one-off action I can run after.
- The `lead_pack` one-time price is unaffected.
- Admin-editable price slider keeps working — it only drives MRR display math, not Stripe.

### Order of operations
1. Create new $49/month Stripe price on existing Pro product → capture new `price_xxx` ID
2. Update the 4 files above with new ID and new copy
3. Run the `admin_settings` SQL update via migration

