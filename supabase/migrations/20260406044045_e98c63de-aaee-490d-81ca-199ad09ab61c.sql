ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS contact_scrape_status text,
ADD COLUMN IF NOT EXISTS contact_scraped_at timestamptz,
ADD COLUMN IF NOT EXISTS scraped_phones text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scraped_emails text[] NOT NULL DEFAULT '{}';