
-- Admin UPDATE on company_settings
CREATE POLICY "Admins can update all company settings"
ON public.company_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE on company_settings
CREATE POLICY "Admins can delete all company settings"
ON public.company_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin UPDATE on profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE on usage_tracking
CREATE POLICY "Admins can delete all usage"
ON public.usage_tracking FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE on leads
CREATE POLICY "Admins can delete all leads"
ON public.leads FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT on company_settings (for upsert)
CREATE POLICY "Admins can insert company settings"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
