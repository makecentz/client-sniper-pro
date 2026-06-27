# Email Marketing System (Resend)

Two systems sharing one Resend connector and one suppression model:
1. **Admin broadcasts** — ad-hoc emails to a chosen audience.
2. **Trial-to-Pro drip** — automated 4-email sequence at day 0, 1, 3, 7 after signup. Auto-stops when the user upgrades to Pro or unsubscribes.

Lovable's built-in email system can't be used for this — it refuses bulk/marketing sends. Resend (already a Lovable connector) handles it cleanly.

---

## Why React Email + visual preview (not TipTap)

You picked this option. Tradeoff: composing isn't pure drag-and-drop — the admin edits a small set of structured fields (subject, headline, body paragraphs, CTA, hero image URL) and sees a live rendered preview on the right. Output HTML is rock-solid across Gmail/Outlook/Apple Mail because it's React Email under the hood. Images are supported via URL (uploaded to Lovable Cloud storage with a picker). If you later want free-form rich text inside the body block, we can swap that one field for a lightweight markdown editor without rewriting the system.

---

## Admin UI (under `/admin`)

New "Emails" tab with three sub-sections:

### 1. Campaigns (drip sequence)
- List the 4 drip emails (Day 0 / Day 1 / Day 3 / Day 7).
- Edit each: subject, headline, body, CTA label + URL, optional hero image (upload → Lovable Cloud storage bucket `email-assets`).
- Live preview pane on the right showing rendered email at desktop + mobile widths.
- Toggle to enable/disable the whole drip.
- "Send test to me" button.

### 2. Broadcasts
- Composer: same field set as drip emails, same live preview.
- Audience picker: All users / Free (trial) only / Pro only / Signed up in last N days / Custom email list paste.
- "Send test" + "Schedule send" (sends immediately or at chosen datetime).
- Past broadcasts list with sent count, open rate (from Resend webhooks), failures.

### 3. Users tab (extend existing)
- New column: **Marketing emails** — shows `enabled` / `disabled (pro)` / `unsubscribed`.
- New column: **Drip progress** — `2 / 4 sent` etc.
- Per-row toggle to manually pause/resume marketing for a user.

---

## Drip logic

- On signup (existing `handle_new_user` trigger): insert row into `email_campaign_state` with `current_step = 0`, `next_send_at = now() + interval '0'`, `enabled = true`.
- Cron job (pg_cron, every 15 min) calls edge function `process-drip-queue`:
  - Selects users where `enabled = true`, `next_send_at <= now()`, `current_step < 4`, and `is_pro = false`.
  - Sends the step's email via Resend, logs to `marketing_email_log`, advances step, schedules next send (day 1, 3, 7 from previous).
- On Stripe `check-subscription` flip to Pro → set `enabled = false, stopped_reason = 'upgraded'`. Already wired in `check-subscription`/`stripe-webhook` — we add one update there.
- Unsubscribe link in every email → `/unsubscribe?token=...` (existing route, extended to also flip marketing flag).

---

## Resend setup

Use Resend via the **standard connector** (`standard_connectors--connect` with `resend`). All sends go through the Lovable connector gateway — no API key handling needed in code. Uses `from: marketing@clienthunterai.com` (requires verifying that domain in Resend; you'll do this in the Resend dashboard after we connect — I'll surface the exact DNS records once we get there).

---

## Technical details

### New tables
- `email_templates` — `id`, `slug` (unique: `drip_day_0`, `drip_day_1`, `drip_day_3`, `drip_day_7`), `subject`, `headline`, `body`, `cta_label`, `cta_url`, `hero_image_url`, `updated_at`. RLS: admin-only.
- `email_campaign_state` — `user_id` (PK FK), `enabled`, `current_step`, `next_send_at`, `stopped_reason`, `unsubscribed_at`. RLS: user can read own, admin all.
- `email_broadcasts` — `id`, `created_by`, `subject`, `body_json`, `audience_filter`, `scheduled_for`, `sent_at`, `sent_count`, `failed_count`. RLS: admin-only.
- `marketing_email_log` — `id`, `user_id`, `email`, `kind` (`drip` / `broadcast`), `template_slug` or `broadcast_id`, `resend_message_id`, `status`, `error`, `sent_at`. RLS: admin read.
- `marketing_unsubscribes` — `email` (PK), `unsubscribed_at`, `source`.

All tables get the standard GRANT block + RLS policies using existing `has_role(auth.uid(), 'admin')`.

### New edge functions
- `send-broadcast` — admin-only, accepts broadcast id, resolves audience, batches sends through Resend gateway, respects `marketing_unsubscribes`, logs each.
- `process-drip-queue` — cron-triggered, processes due drip sends.
- `send-test-email` — admin-only, renders a template with sample data and sends to caller.
- `resend-webhook` — receives Resend delivery/bounce/complaint events, writes to `marketing_email_log` + `marketing_unsubscribes`.

### Cron
pg_cron job every 15 min calling `process-drip-queue`.

### Hook into Pro upgrade
In `check-subscription` and `stripe-webhook`: when a subscription becomes active, `UPDATE email_campaign_state SET enabled=false, stopped_reason='upgraded' WHERE user_id = ...`.

### Storage
New public bucket `email-assets` for hero images uploaded from the composer.

### Frontend
- `src/pages/admin/EmailsTab.tsx` with three sub-routes.
- `src/components/email/EmailComposer.tsx` — structured fields + live preview iframe rendering the React Email template via a `preview-email` edge function.
- Extend `src/pages/Admin.tsx` Users table with marketing columns/toggle.

### Seed
4 starter drip emails written for ClientHunter AI trial-to-Pro conversion (value, social proof, feature highlight, urgency/discount).

---

## Out of scope (call out if you want them)
- A/B testing on subject lines.
- Open/click tracking beyond what Resend webhooks give us.
- Visual drag-and-drop builder (TipTap or MJML editor) — happy to add later.
