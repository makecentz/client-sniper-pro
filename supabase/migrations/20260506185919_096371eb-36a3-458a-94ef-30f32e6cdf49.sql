-- Tighten admin_settings to admins-only reads (had broad authenticated read)
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.admin_settings;
CREATE POLICY "Admins can view settings"
ON public.admin_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict social_proof_settings reads to authenticated users
DROP POLICY IF EXISTS "Public can read settings" ON public.social_proof_settings;
CREATE POLICY "Authenticated can read settings"
ON public.social_proof_settings FOR SELECT TO authenticated
USING (true);

-- Restrict 'Admins can view all roles' on user_roles to authenticated only
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Lock down impression UPDATE: only service_role may update click data
DROP POLICY IF EXISTS "Anyone can update impression clicks" ON public.social_proof_impressions_log;
CREATE POLICY "Service role updates impression clicks"
ON public.social_proof_impressions_log FOR UPDATE TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Revoke EXECUTE on SECURITY DEFINER helper functions from anon/authenticated where unsafe.
-- record_affiliate_click is called from an edge function with service role
REVOKE EXECUTE ON FUNCTION public.record_affiliate_click(text, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text, text, text) TO service_role;

-- Email queue helpers — service role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- has_role is needed by authenticated users for client checks; revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;