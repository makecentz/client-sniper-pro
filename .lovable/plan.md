Replace the displayed Pro price ($49) with $69 across the site. Stripe price IDs are not touched — only UI copy.

**Edits**
- `src/pages/Landing.tsx` (line 305): `$49` → `$69` in pricing card.
- `src/pages/dashboard/DashboardSettings.tsx` (lines 422, 443): `$49/mo` → `$69/mo` in current-plan label and upgrade button.
- `src/pages/Admin.tsx` (lines 37–38): default `proPrice` state `49` → `69`.

**Not changed**
- Stripe product/price config (no code price ID change requested). If you also want the actual Stripe charge updated to $69, say the word and I'll create a new Stripe price and swap the price ID.