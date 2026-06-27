
-- ============ email_templates ============
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ email_campaign_state ============
CREATE TABLE public.email_campaign_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  current_step INT NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  stopped_reason TEXT,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_state TO authenticated;
GRANT ALL ON public.email_campaign_state TO service_role;
ALTER TABLE public.email_campaign_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own campaign state" ON public.email_campaign_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update campaign state" ON public.email_campaign_state
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete campaign state" ON public.email_campaign_state
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_email_campaign_state_updated
  BEFORE UPDATE ON public.email_campaign_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ email_broadcasts ============
CREATE TABLE public.email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  custom_emails TEXT[],
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_broadcasts TO authenticated;
GRANT ALL ON public.email_broadcasts TO service_role;
ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcasts" ON public.email_broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_email_broadcasts_updated
  BEFORE UPDATE ON public.email_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ marketing_email_log ============
CREATE TABLE public.marketing_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  template_slug TEXT,
  broadcast_id UUID REFERENCES public.email_broadcasts(id) ON DELETE SET NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_email_log TO authenticated;
GRANT ALL ON public.marketing_email_log TO service_role;
ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read marketing log" ON public.marketing_email_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ marketing_unsubscribes ============
CREATE TABLE public.marketing_unsubscribes (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'link'
);
GRANT SELECT ON public.marketing_unsubscribes TO authenticated;
GRANT ALL ON public.marketing_unsubscribes TO service_role;
ALTER TABLE public.marketing_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unsubscribes" ON public.marketing_unsubscribes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ Seed drip templates ============
INSERT INTO public.email_templates (slug, subject, headline, body, cta_label, cta_url) VALUES
('drip_day_0', 'Welcome to ClientHunter AI — let''s find your first client', 'Your AI-powered lead machine is ready',
  E'Hey there,\n\nWelcome to ClientHunter AI. You now have everything you need to find local business leads, qualify them with AI, and reach out at scale.\n\nYour trial gives you a taste — Pro unlocks unlimited searches, AI outreach, and the full chatbot suite.',
  'Explore the dashboard', 'https://clienthunterai.com/dashboard'),
('drip_day_1', 'See how Pro users land 3-5 clients/month', 'One workflow, repeated weekly',
  E'Most ClientHunter Pro users follow the same loop:\n\n1. Search a city + industry\n2. Save the best 20 leads\n3. Generate AI outreach in one click\n4. Send and close\n\nFree trial limits you to a fraction of this volume. Pro removes the ceiling.',
  'Upgrade to Pro', 'https://clienthunterai.com/dashboard/settings'),
('drip_day_3', 'Unlock unlimited searches + AI outreach', 'You''re halfway through your trial',
  E'Quick reminder: your trial caps you at limited searches and outreach generations per month.\n\nPro users get:\n- Unlimited business searches\n- Unlimited AI-generated outreach emails\n- Full chatbot builder for client sites\n- Priority support',
  'See Pro pricing', 'https://clienthunterai.com/dashboard/settings'),
('drip_day_7', 'Last chance — special offer inside', 'Don''t lose your momentum',
  E'Your trial period is ending. Don''t let your lead pipeline go cold.\n\nUpgrade today and keep the searches, the outreach, and the chatbots flowing. We''ll honor the launch price for new Pro users this week.',
  'Claim Pro now', 'https://clienthunterai.com/dashboard/settings');

-- ============ Update handle_new_user to seed campaign state ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.usage_tracking (user_id)
  VALUES (NEW.id);

  INSERT INTO public.email_campaign_state (user_id, email, current_step, next_send_at, enabled)
  VALUES (NEW.id, NEW.email, 0, now(), true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Backfill: insert disabled rows for existing users so admin can see them
INSERT INTO public.email_campaign_state (user_id, email, current_step, next_send_at, enabled, stopped_reason)
SELECT u.id, u.email, 4, NULL, false, 'pre-existing'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
