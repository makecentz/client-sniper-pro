## Goal
Add First Name and Last Name fields to "Your Company Information" and use the First Name when the AI signs generated outreach content.

## Changes

### 1. Database — migration on `company_settings`
- `ALTER TABLE public.company_settings ADD COLUMN first_name text, ADD COLUMN last_name text;`
- No new table, so existing GRANTs/RLS already cover the columns.

### 2. UI — `src/pages/dashboard/DashboardSettings.tsx`
- Extend the `company` state with `first_name` and `last_name`.
- Add two new inputs at the top of the Company Information card: "First Name" and "Last Name" (side-by-side on desktop).
- Include both fields in the `select(...)` load query and in the `upsert` save.

### 3. Edge function — `supabase/functions/generate-outreach/index.ts`
- Add `first_name, last_name` to the `company_settings` select.
- Append the sender's name to `companyContext` so the model has it:
  - `Sender First Name: ...`
  - `Sender Last Name: ...`
- Update each prompt template (email / dm / sms / offer / followup1 / followup2) so the signature/sign-off uses the sender's first name (e.g. "Sign off using the sender's first name above the company name"). When first name is missing, fall back to the company name (current behavior).

### 4. Out of scope
- No changes to other edge functions or to the lead's contact-name handling. The "name pre-fill" referred to in the request is the sender (from Company Info), which is what the signature uses.

## Technical notes
- Type regeneration for `company_settings` happens automatically after the migration runs; the new fields will be available to the frontend without manual edits to `src/integrations/supabase/types.ts`.
- The edge function reads `company_settings` with the service-role client, so RLS is not a concern for the new columns.
