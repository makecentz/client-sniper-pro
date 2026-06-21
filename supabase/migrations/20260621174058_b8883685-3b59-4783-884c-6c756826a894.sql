
-- 1. Chatbots: remove broad anon SELECT, expose only widget-safe columns through a view
DROP POLICY IF EXISTS "Public can read active bots for widget" ON public.chatbots;

CREATE OR REPLACE VIEW public.chatbots_public AS
SELECT id, name, brand_color, logo_url, welcome_message, suggested_questions, is_active
FROM public.chatbots
WHERE is_active = true;

GRANT SELECT ON public.chatbots_public TO anon, authenticated;

-- 2. social_proof_settings: remove blanket authenticated read, expose only display fields
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.social_proof_settings;

CREATE OR REPLACE VIEW public.social_proof_public_settings AS
SELECT id, enabled, mobile_enabled, position, display_duration_seconds,
       delay_between_seconds, animation_type, show_close_button, auto_rotate,
       show_city_state, click_action, loop_notifications, randomize_order
FROM public.social_proof_settings;

GRANT SELECT ON public.social_proof_public_settings TO anon, authenticated;
