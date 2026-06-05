
-- Restrict anon read on chatbots; expose only widget-safe fields via SECURITY DEFINER function
DROP POLICY IF EXISTS "Public can read active bots for widget" ON public.chatbots;

CREATE OR REPLACE FUNCTION public.get_public_chatbot(_bot_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  brand_color text,
  welcome_message text,
  logo_url text,
  suggested_questions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.brand_color, c.welcome_message, c.logo_url, c.suggested_questions
  FROM public.chatbots c
  WHERE c.id = _bot_id AND c.is_active = true
$$;

GRANT EXECUTE ON FUNCTION public.get_public_chatbot(uuid) TO anon, authenticated;

-- Make intent explicit: only service_role may insert affiliate clicks
CREATE POLICY "Service role inserts affiliate clicks"
  ON public.affiliate_clicks
  FOR INSERT
  TO service_role
  WITH CHECK (true);
