
DROP POLICY IF EXISTS "Public can increment clicks" ON public.affiliate_links;

CREATE OR REPLACE FUNCTION public.record_affiliate_click(_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE referral_code = _code;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_click(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(TEXT) TO anon, authenticated;
