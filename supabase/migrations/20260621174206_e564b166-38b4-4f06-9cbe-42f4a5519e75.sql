
CREATE OR REPLACE FUNCTION public.get_social_proof_settings_admin()
RETURNS public.social_proof_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.social_proof_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT * INTO result FROM public.social_proof_settings WHERE id = 1;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_social_proof_settings_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_social_proof_settings_admin() TO authenticated;
