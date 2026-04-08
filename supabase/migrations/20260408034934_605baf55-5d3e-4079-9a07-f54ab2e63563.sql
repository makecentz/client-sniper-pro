CREATE POLICY "Admins can view all company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));