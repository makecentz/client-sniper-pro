# Admin-Managed API Keys

Give admins a place in the admin panel to view, replace, and test the third-party API keys the app runs on — without touching code or backend settings.

## Which keys are manageable

Editable from the admin panel:
- Outscraper (business search)
- ScreenshotOne (site screenshots)
- Google Maps
- Stripe secret key
- Stripe webhook signing secret
- Resend / email sending key
- Site URL (used in emails and checkout redirects)

Not editable (platform-managed, shown read-only as "managed"): the database service keys and the Lovable AI key. Changing those would break the app, so they stay locked.

## How it works

A new `app_api_keys` table stores the current value for each key name. Backend functions look up the key in that table first and fall back to the existing environment secret if no override is saved. So nothing breaks on day one — saved overrides simply take priority.

Values are never sent back to the browser. The admin screen shows only a masked preview (e.g. `sk_live_••••4821`), when it was last updated, and whether an override exists or the built-in value is in use. Admins can paste a new value, save it, clear the override (revert to built-in), or run a "Test key" check that calls the provider and reports success/failure.

## Technical detail

1. **Migration**
   - `public.app_api_keys` (`key_name` unique, `value` text, `updated_at`, `updated_by`).
   - GRANTs: `ALL` to `service_role` only — no `anon`/`authenticated` grants, so the raw secret is unreachable from the client. RLS enabled with no client policies.
2. **Edge function `admin-api-keys`** (admin-only, verifies JWT + `has_role(uid,'admin')`):
   - `list` — returns key name, masked preview, source (`override` | `builtin` | `missing`), `updated_at`.
   - `set` / `clear` — upsert or delete an override; validates the name against an allowlist of the manageable keys above.
   - `test` — lightweight provider call per key (Stripe `/v1/balance`, Outscraper profile ping, ScreenshotOne usage, Google Maps geocode, Resend domains) and returns ok/error.
3. **Shared helper** `supabase/functions/_shared/api-keys.ts` exporting `getApiKey(name)`: reads `app_api_keys` via service role (short in-memory cache per invocation), falls back to `Deno.env.get(name)`.
4. **Call-site updates**: replace `Deno.env.get("OUTSCRAPER_API_KEY" | "SCREENSHOTONE_API_KEY" | "GOOGLE_MAPS_API_KEY" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "RESEND_API_KEY" | "SITE_URL")` with `await getApiKey(...)` in the functions that use them (`search-businesses`, `capture-screenshot`, `get-maps-key`, `heatmap-search`, `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`, email senders).
5. **Admin UI**: new `src/components/admin/ApiKeysManager.tsx` rendered as an "API Keys" section in `src/pages/Admin.tsx`, matching the existing settings-card styling — one row per key with masked value, status badge, input + Save, Clear, and Test buttons.

## Security notes

- Saved values are only readable by backend functions via the service role; the admin UI never receives plaintext.
- Every write is admin-gated server-side, not just hidden in the UI.
