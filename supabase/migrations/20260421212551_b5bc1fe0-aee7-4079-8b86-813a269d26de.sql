
-- ============ TABLES ============

CREATE TABLE public.social_proof_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  mobile_enabled boolean NOT NULL DEFAULT true,
  position text NOT NULL DEFAULT 'bottom-left',
  display_duration_seconds integer NOT NULL DEFAULT 5,
  delay_between_seconds integer NOT NULL DEFAULT 8,
  animation_type text NOT NULL DEFAULT 'slide-up',
  show_close_button boolean NOT NULL DEFAULT true,
  auto_rotate boolean NOT NULL DEFAULT true,
  source_mode text NOT NULL DEFAULT 'hybrid',
  show_city_state boolean NOT NULL DEFAULT false,
  click_action text,
  loop_notifications boolean NOT NULL DEFAULT true,
  randomize_order boolean NOT NULL DEFAULT true,
  auto_approve_signups boolean NOT NULL DEFAULT true,
  auto_approve_trials boolean NOT NULL DEFAULT true,
  auto_approve_demo_bookings boolean NOT NULL DEFAULT true,
  require_approval_client_wins boolean NOT NULL DEFAULT true,
  require_approval_closed_leads boolean NOT NULL DEFAULT true,
  auto_expire_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

CREATE TABLE public.social_proof_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  first_name text NOT NULL,
  last_initial text NOT NULL,
  city text NOT NULL,
  state text,
  display_location text,
  custom_message text,
  rendered_message text,
  source_type text NOT NULL,
  is_real_event boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  click_action text,
  linked_url text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sp_events_active ON public.social_proof_events (is_active, is_approved) WHERE is_active AND is_approved;

CREATE TABLE public.social_proof_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text UNIQUE NOT NULL,
  template_text text NOT NULL,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.social_proof_name_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_initial text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.social_proof_city_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text,
  display_label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.social_proof_impressions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.social_proof_events(id) ON DELETE CASCADE,
  session_id text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  clicked boolean NOT NULL DEFAULT false,
  clicked_at timestamptz
);

-- ============ TRIGGERS ============

CREATE TRIGGER trg_sp_settings_updated BEFORE UPDATE ON public.social_proof_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sp_events_updated BEFORE UPDATE ON public.social_proof_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sp_templates_updated BEFORE UPDATE ON public.social_proof_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sp_names_updated BEFORE UPDATE ON public.social_proof_name_pool
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sp_cities_updated BEFORE UPDATE ON public.social_proof_city_pool
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============

ALTER TABLE public.social_proof_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_name_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_city_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof_impressions_log ENABLE ROW LEVEL SECURITY;

-- Settings: public read, admin write
CREATE POLICY "Public can read settings" ON public.social_proof_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.social_proof_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Events: public can read active+approved; admins full
CREATE POLICY "Public can read active approved events" ON public.social_proof_events FOR SELECT
  USING (is_active AND is_approved);
CREATE POLICY "Admins manage events" ON public.social_proof_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Templates: public read, admin write
CREATE POLICY "Public can read templates" ON public.social_proof_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates" ON public.social_proof_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Name pool: public read active, admin write
CREATE POLICY "Public can read active names" ON public.social_proof_name_pool FOR SELECT USING (active);
CREATE POLICY "Admins manage names" ON public.social_proof_name_pool FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- City pool: public read active, admin write
CREATE POLICY "Public can read active cities" ON public.social_proof_city_pool FOR SELECT USING (active);
CREATE POLICY "Admins manage cities" ON public.social_proof_city_pool FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Impressions log: anyone can insert; only admins can read
CREATE POLICY "Anyone can log impressions" ON public.social_proof_impressions_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update impression clicks" ON public.social_proof_impressions_log FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins read impressions" ON public.social_proof_impressions_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ============ SEED: SETTINGS ============
INSERT INTO public.social_proof_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ SEED: TEMPLATES ============
INSERT INTO public.social_proof_templates (event_type, template_text) VALUES
  ('signed_up', '{first_name} {last_initial}. just signed up from {city}'),
  ('started_trial', '{first_name} {last_initial}. started a 7-day trial from {city}'),
  ('booked_demo', '{first_name} {last_initial}. booked a demo from {city}'),
  ('upgraded_account', '{first_name} {last_initial}. upgraded their account from {city}'),
  ('launched_first_campaign', '{first_name} {last_initial}. launched their first campaign from {city}'),
  ('got_new_client', '{first_name} {last_initial}. just got a new website client from {city}'),
  ('closed_lead', '{first_name} {last_initial}. closed a lead from {city}'),
  ('custom_message', '{custom_message}')
ON CONFLICT (event_type) DO NOTHING;

-- ============ SEED: NAME POOL ============
INSERT INTO public.social_proof_name_pool (first_name, last_initial) VALUES
  ('Mike','S'),('Sarah','T'),('James','R'),('Tasha','B'),('Andre','W'),
  ('Marcus','J'),('Danielle','P'),('Chris','M'),('Jasmine','L'),('David','K'),
  ('Amanda','C'),('Kevin','H'),('Monica','D'),('Brian','F'),('Alicia','G'),
  ('Steven','N'),('Erica','V'),('Brandon','Q'),('Nicole','A'),('Terrence','E'),
  ('Kayla','I'),('Jonathan','O'),('Tiffany','U'),('Robert','Y'),('Ashley','P'),
  ('Sean','T'),('Megan','R'),('Anthony','B'),('Latoya','J'),('Malik','C'),
  ('Trevon','H'),('Janelle','D'),('Maurice','W'),('Tamika','F'),('Darnell','G'),
  ('Nia','L'),('Xavier','K'),('Brianna','M'),('DeAndre','S'),('Kiara','T');

-- ============ SEED: CITY POOL ============
INSERT INTO public.social_proof_city_pool (city, state, display_label) VALUES
  ('New York City','NY','New York City'),('Philadelphia','PA','Philadelphia'),
  ('Atlanta','GA','Atlanta'),('Chicago','IL','Chicago'),('Houston','TX','Houston'),
  ('Dallas','TX','Dallas'),('Miami','FL','Miami'),('Charlotte','NC','Charlotte'),
  ('Newark','NJ','Newark'),('Los Angeles','CA','Los Angeles'),
  ('Phoenix','AZ','Phoenix'),('Detroit','MI','Detroit'),('Baltimore','MD','Baltimore'),
  ('Orlando','FL','Orlando'),('Tampa','FL','Tampa'),('Nashville','TN','Nashville'),
  ('Washington','DC','Washington'),('Boston','MA','Boston'),('Columbus','OH','Columbus'),
  ('Indianapolis','IN','Indianapolis'),('Jacksonville','FL','Jacksonville'),
  ('Raleigh','NC','Raleigh'),('San Antonio','TX','San Antonio'),
  ('Memphis','TN','Memphis'),('Cleveland','OH','Cleveland');

-- ============ SEED: 30 EVENTS ============
INSERT INTO public.social_proof_events (event_type, first_name, last_initial, city, state, source_type, is_real_event, is_approved, is_active)
VALUES
  ('signed_up','Mike','S','New York City','NY','random_generated',false,true,true),
  ('started_trial','Sarah','T','Atlanta','GA','random_generated',false,true,true),
  ('booked_demo','James','R','Chicago','IL','random_generated',false,true,true),
  ('upgraded_account','Tasha','B','Philadelphia','PA','random_generated',false,true,true),
  ('launched_first_campaign','Andre','W','Houston','TX','random_generated',false,true,true),
  ('got_new_client','Marcus','J','Miami','FL','random_generated',false,true,true),
  ('closed_lead','Danielle','P','Charlotte','NC','random_generated',false,true,true),
  ('signed_up','Chris','M','Dallas','TX','random_generated',false,true,true),
  ('started_trial','Jasmine','L','Newark','NJ','random_generated',false,true,true),
  ('booked_demo','David','K','Los Angeles','CA','random_generated',false,true,true),
  ('upgraded_account','Amanda','C','Phoenix','AZ','random_generated',false,true,true),
  ('launched_first_campaign','Kevin','H','Detroit','MI','random_generated',false,true,true),
  ('got_new_client','Monica','D','Baltimore','MD','random_generated',false,true,true),
  ('closed_lead','Brian','F','Orlando','FL','random_generated',false,true,true),
  ('signed_up','Alicia','G','Tampa','FL','random_generated',false,true,true),
  ('started_trial','Steven','N','Nashville','TN','random_generated',false,true,true),
  ('booked_demo','Erica','V','Washington','DC','random_generated',false,true,true),
  ('upgraded_account','Brandon','Q','Boston','MA','random_generated',false,true,true),
  ('launched_first_campaign','Nicole','A','Columbus','OH','random_generated',false,true,true),
  ('got_new_client','Terrence','E','Indianapolis','IN','random_generated',false,true,true),
  ('closed_lead','Kayla','I','Jacksonville','FL','random_generated',false,true,true),
  ('signed_up','Jonathan','O','Raleigh','NC','random_generated',false,true,true),
  ('started_trial','Tiffany','U','San Antonio','TX','random_generated',false,true,true),
  ('booked_demo','Robert','Y','Memphis','TN','random_generated',false,true,true),
  ('upgraded_account','Ashley','P','Cleveland','OH','random_generated',false,true,true),
  ('launched_first_campaign','Sean','T','New York City','NY','random_generated',false,true,true),
  ('got_new_client','Megan','R','Atlanta','GA','random_generated',false,true,true),
  ('closed_lead','Anthony','B','Chicago','IL','random_generated',false,true,true),
  ('signed_up','Latoya','J','Houston','TX','random_generated',false,true,true),
  ('booked_demo','Malik','C','Miami','FL','random_generated',false,true,true);
