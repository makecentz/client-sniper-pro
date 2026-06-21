
-- Remove helper views (linter flagged them as security definer views)
DROP VIEW IF EXISTS public.chatbots_public;
DROP VIEW IF EXISTS public.social_proof_public_settings;

-- ===== chatbots: column-scoped anon read =====
REVOKE SELECT ON public.chatbots FROM anon;
GRANT SELECT (id, name, brand_color, logo_url, welcome_message, suggested_questions, is_active)
  ON public.chatbots TO anon;

CREATE POLICY "Anon can read active bots (safe columns only)"
  ON public.chatbots
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ===== social_proof_settings: column-scoped authenticated/anon read =====
REVOKE SELECT ON public.social_proof_settings FROM authenticated, anon;
GRANT SELECT (id, enabled, mobile_enabled, position, display_duration_seconds,
              delay_between_seconds, animation_type, show_close_button, auto_rotate,
              show_city_state, click_action, loop_notifications, randomize_order)
  ON public.social_proof_settings TO anon, authenticated;

CREATE POLICY "Public can read display settings (safe columns only)"
  ON public.social_proof_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);
