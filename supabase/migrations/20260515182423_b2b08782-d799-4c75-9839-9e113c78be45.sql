ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_message text,
  ADD COLUMN IF NOT EXISTS admin_message_at timestamptz;