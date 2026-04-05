

# Next Step: Stripe Webhook + Auth Email Templates

## What's Done
- Phases 1–5 complete (UI, search, AI tools, Stripe checkout, mailto integration)
- Landing page with pricing section
- Email domain configured (notify.clienthunterai.com)
- All edge functions deployed

## What's Missing

### 1. Stripe Webhook — `stripe-webhook` Edge Function
The checkout flow creates Stripe sessions, but there's no webhook to handle `checkout.session.completed`. Without it, purchasing a lead pack doesn't actually credit leads to the user's account — only the subscription check (polling) works, and even that relies on periodic calls rather than instant updates.

**Build:**
- Create `supabase/functions/stripe-webhook/index.ts`
- Handle `checkout.session.completed` event:
  - If metadata `type === "pro_subscription"` → update `usage_tracking` set `plan = 'pro'`, `leads_remaining = 9999`
  - If metadata `type === "lead_pack"` → increment `leads_remaining` by 15
- Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`
- Log events to `webhook_logs` table (already exists)
- Request `STRIPE_WEBHOOK_SECRET` from user (need to create webhook in Stripe dashboard pointing to the edge function URL)

### 2. Branded Auth Email Templates
Email domain is set up. Scaffold and brand the auth email templates (signup confirmation, password reset, magic link) to match ClientHunter AI's dark theme with blue accents.

**Build:**
- Scaffold templates using the built-in tooling
- Apply brand styling: primary blue (#3B82F6), dark backgrounds for accents, white email body, Inter font
- Deploy the auth-email-hook edge function

## Technical Details

**Stripe Webhook Flow:**
```text
Stripe → POST /stripe-webhook → verify signature → parse event
  → checkout.session.completed
    → read metadata.type
    → update usage_tracking table
    → log to webhook_logs
```

**Files to create/edit:**
- `supabase/functions/stripe-webhook/index.ts` — new
- `supabase/config.toml` — add webhook function config
- Auth email template files — created by scaffold tool
- Brand styling applied to all 6 email templates

**Secret needed:** `STRIPE_WEBHOOK_SECRET` — user must create a webhook endpoint in their Stripe dashboard pointing to the edge function URL and copy the signing secret.

