
-- AFFILIATE LINKS
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own link" ON public.affiliate_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own link" ON public.affiliate_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can lookup by code" ON public.affiliate_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can increment clicks" ON public.affiliate_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins view all links" ON public.affiliate_links FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- AFFILIATE REFERRALS
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_to_pro BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ
);
CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_user_id);
CREATE INDEX idx_affiliate_referrals_referred ON public.affiliate_referrals(referred_user_id);
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate views own referrals" ON public.affiliate_referrals FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "User can insert own referral row" ON public.affiliate_referrals FOR INSERT WITH CHECK (auth.uid() = referred_user_id);
CREATE POLICY "Admins view all referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update referrals" ON public.affiliate_referrals FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- AFFILIATE COMMISSIONS
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL,
  referral_id UUID NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_user_id);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate views own commissions" ON public.affiliate_commissions FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Admins view all commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update commissions" ON public.affiliate_commissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- AFFILIATE PAYOUTS
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_user_id);
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate views own payouts" ON public.affiliate_payouts FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Affiliate requests own payout" ON public.affiliate_payouts FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id AND status = 'requested');
CREATE POLICY "Admins view all payouts" ON public.affiliate_payouts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update payouts" ON public.affiliate_payouts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed default commission rate
INSERT INTO public.admin_settings (key, value) VALUES ('affiliate_commission_rate', '30')
ON CONFLICT DO NOTHING;
