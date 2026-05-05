
CREATE TABLE public.affiliate_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'US' CHECK (country = 'US'),
  payout_method text NOT NULL CHECK (payout_method IN ('paypal','bank','check')),
  payout_details text NOT NULL,
  i9_file_path text,
  i9_uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own affiliate profile" ON public.affiliate_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own affiliate profile" ON public.affiliate_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own affiliate profile" ON public.affiliate_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all affiliate profiles" ON public.affiliate_profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all affiliate profiles" ON public.affiliate_profiles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_profiles_updated_at
  BEFORE UPDATE ON public.affiliate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('affiliate-documents', 'affiliate-documents', false);

CREATE POLICY "Affiliates upload own docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'affiliate-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Affiliates view own docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'affiliate-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Affiliates update own docs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'affiliate-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all affiliate docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'affiliate-documents' AND has_role(auth.uid(), 'admin'::app_role));
