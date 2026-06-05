
-- Remove SECURITY DEFINER helper (flagged by linter); use column-level grants instead
DROP FUNCTION IF EXISTS public.get_public_chatbot(uuid);

-- Remove redundant service_role policy (service_role bypasses RLS already)
DROP POLICY IF EXISTS "Service role inserts affiliate clicks" ON public.affiliate_clicks;

-- Restore narrow anon SELECT policy on chatbots, but restrict columns via GRANTs
CREATE POLICY "Public can read active bots for widget"
  ON public.chatbots
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Revoke broad SELECT, then grant only widget-safe columns to anon
REVOKE SELECT ON public.chatbots FROM anon;
GRANT SELECT (id, name, brand_color, welcome_message, logo_url, suggested_questions, is_active)
  ON public.chatbots TO anon;
