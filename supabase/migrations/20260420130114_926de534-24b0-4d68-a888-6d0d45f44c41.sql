-- offer_mockups table
CREATE TABLE public.offer_mockups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  before_image_url TEXT,
  after_image_url TEXT,
  image_prompt TEXT,
  design_brief TEXT,
  offer_short TEXT,
  offer_standard TEXT,
  offer_premium TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_mockups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mockups" ON public.offer_mockups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mockups" ON public.offer_mockups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mockups" ON public.offer_mockups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mockups" ON public.offer_mockups FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all mockups" ON public.offer_mockups FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_offer_mockups_lead ON public.offer_mockups(lead_id);
CREATE INDEX idx_offer_mockups_user ON public.offer_mockups(user_id);

CREATE TRIGGER update_offer_mockups_updated_at
BEFORE UPDATE ON public.offer_mockups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add screenshot timestamp to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS screenshot_captured_at TIMESTAMPTZ;

-- Public mockups storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('mockups', 'mockups', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read mockups" ON storage.objects
FOR SELECT USING (bucket_id = 'mockups');

CREATE POLICY "Authenticated users can upload to own mockup folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mockups' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own mockup files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'mockups' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own mockup files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'mockups' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role full access (for edge functions uploading via service role)
CREATE POLICY "Service role manages mockups" ON storage.objects
FOR ALL USING (bucket_id = 'mockups' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'mockups' AND auth.role() = 'service_role');