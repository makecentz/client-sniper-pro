ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gmaps_photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS gmaps_place_id text,
  ADD COLUMN IF NOT EXISTS gmaps_hours jsonb,
  ADD COLUMN IF NOT EXISTS gmaps_reviews jsonb,
  ADD COLUMN IF NOT EXISTS website_prompt text,
  ADD COLUMN IF NOT EXISTS website_prompt_generated_at timestamptz;