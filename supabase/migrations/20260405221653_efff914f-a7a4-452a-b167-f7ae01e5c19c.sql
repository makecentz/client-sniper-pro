
CREATE POLICY "Admins can update all usage"
  ON public.usage_tracking FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
