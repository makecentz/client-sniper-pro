## 1. Restore nav links

In `src/pages/Landing.tsx`, add centered nav links between the logo and the auth buttons: **How It Works**, **Pro**, **Pricing**, **Contact**. Links use in-page anchors (`#how-it-works`, `#pro`, `#pricing`, `#contact`). Hidden on mobile (`hidden md:flex`), visible from `md` up.

Add matching `id` attributes on the corresponding sections (How It Works section ~line 260, the Pro feature section, the Pricing section ~line 480, and the new Contact section).

## 2. Contact form section (below Pricing)

New `<section id="contact">` placed after Pricing and before the final CTA. Card-style form with:
- Name (required, max 100)
- Email (required, valid email)
- Subject (optional, max 150)
- Message (required, max 2000)
- Submit button "Send Message"

Zod validation client-side. On submit, insert into a new `contact_submissions` table, then invoke an edge function to email the admin. Shows toast on success/failure and clears the form.

## 3. Database

New migration creating `public.contact_submissions`:
- `name text not null`
- `email text not null`
- `subject text`
- `message text not null`
- `status text default 'new'`
- standard `id`, `created_at`, `updated_at`

Grants + RLS:
- `GRANT INSERT` to `anon` and `authenticated` (public form).
- `GRANT SELECT, UPDATE` to `authenticated` (admin reads via has_role check).
- `GRANT ALL` to `service_role`.
- Policies: anyone may INSERT; only admins (via `has_role(auth.uid(),'admin')`) may SELECT/UPDATE.
- `updated_at` trigger.

## 4. Admin email edge function

New edge function `send-contact-notification` (`verify_jwt = false`, CORS enabled, zod-validated body). It:
- Looks up admin recipient email from `admin_settings` key `contact_notification_email` (falls back to first user with `admin` role's email via `auth.admin.listUsers` or a `profiles` lookup — chosen at implementation time).
- Enqueues an app email via the existing `send-transactional-email` function using a new template `contact-notification` (fields: name, email, subject, message, submittedAt). Idempotency key = submission id.

New React Email template `supabase/functions/_shared/transactional-email-templates/contact-notification.tsx` registered in `registry.ts`. Brand-styled (dark accents, blue CTA). Subject: `New contact form submission from {name}`.

Deploy `send-contact-notification` after creation. Templates change requires redeploy of `send-transactional-email`.

## 5. Admin dashboard surface

Add a "Contact Submissions" card/section to `src/pages/Admin.tsx` showing a table of recent submissions (name, email, subject, message preview, created_at, status) with a "Mark as handled" action that updates `status`. Uses standard supabase client (RLS restricts to admins).

## Technical notes

- Client uses `supabase.functions.invoke('send-contact-notification', { body })` after successful insert, passing the new row's `id` so the function can build an idempotency key and reference it.
- The email is a transactional notification to the admin triggered by a specific user action (form submission) — allowed under app-email rules.
- No new secrets required; uses existing `LOVABLE_API_KEY` / email infrastructure already set up.
- SEO: form uses semantic `<form>`, labels, and `aria-*` attributes.
