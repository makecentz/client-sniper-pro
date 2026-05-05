
-- Click log for proper attribution + anti-fraud
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  affiliate_user_id UUID NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_code ON public.affiliate_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_iphash ON public.affiliate_clicks(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_affiliate ON public.affiliate_clicks(affiliate_user_id);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Only admins read (clicks are system-managed; affiliates see aggregated counts on affiliate_links)
CREATE POLICY "Admins view all clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Default attribution settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('affiliate_attribution_window_days', '30'),
  ('affiliate_click_rate_limit_per_min', '10')
ON CONFLICT (key) DO NOTHING;

-- Replace record_affiliate_click: log click, rate-limit by IP, then increment counter.
-- Returns affiliate_user_id of the link (or null if invalid/rate-limited).
CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  _code TEXT,
  _ip_hash TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _affiliate_id UUID;
  _recent_count INT;
  _rate_limit INT;
BEGIN
  SELECT user_id INTO _affiliate_id FROM public.affiliate_links WHERE referral_code = _code;
  IF _affiliate_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Rate limit: max N clicks per IP per minute (across all codes)
  IF _ip_hash IS NOT NULL THEN
    SELECT COALESCE(value::int, 10) INTO _rate_limit
      FROM public.admin_settings WHERE key = 'affiliate_click_rate_limit_per_min';
    SELECT count(*) INTO _recent_count
      FROM public.affiliate_clicks
      WHERE ip_hash = _ip_hash AND created_at > now() - interval '1 minute';
    IF _recent_count >= COALESCE(_rate_limit, 10) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.affiliate_clicks (referral_code, affiliate_user_id, ip_hash, user_agent)
    VALUES (_code, _affiliate_id, _ip_hash, _user_agent);

  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE referral_code = _code;
  RETURN _affiliate_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_affiliate_click(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Drop the old single-arg signature if present (replaced by 3-arg version).
DROP FUNCTION IF EXISTS public.record_affiliate_click(TEXT);
