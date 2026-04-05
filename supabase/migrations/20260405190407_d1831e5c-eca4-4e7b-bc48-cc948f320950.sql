CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  website_dev_price TEXT,
  current_deal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company settings"
ON public.company_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings"
ON public.company_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings"
ON public.company_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company settings"
ON public.company_settings FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();