UPDATE public.admin_settings SET value = '25', updated_at = now() WHERE key = 'pro_price_monthly';
INSERT INTO public.admin_settings (key, value)
SELECT 'pro_price_monthly', '25'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'pro_price_monthly');