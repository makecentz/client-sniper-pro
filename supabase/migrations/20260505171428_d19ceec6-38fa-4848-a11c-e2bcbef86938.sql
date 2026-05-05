
-- Harden affiliate click tracking: remove permissive RLS policies that allowed
-- any anon/authenticated user to read all affiliate_links or update them directly.
-- All public access goes through the SECURITY DEFINER RPC instead.
DROP POLICY IF EXISTS "Public can lookup by code" ON public.affiliate_links;
DROP POLICY IF EXISTS "Public can increment clicks" ON public.affiliate_links;

-- Lock down record_affiliate_click: revoke broad EXECUTE, grant only to anon + authenticated.
REVOKE EXECUTE ON FUNCTION public.record_affiliate_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text) TO anon, authenticated;

-- Add 'approved' status to payouts so admins can approve before marking paid.
ALTER TABLE public.affiliate_payouts DROP CONSTRAINT IF EXISTS affiliate_payouts_status_check;
ALTER TABLE public.affiliate_payouts ADD CONSTRAINT affiliate_payouts_status_check
  CHECK (status IN ('requested', 'approved', 'paid', 'rejected'));
