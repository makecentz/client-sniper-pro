-- 1. Affiliate identity documents: allow owners and admins to remove files
CREATE POLICY "Affiliates delete own docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'affiliate-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins delete affiliate docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'affiliate-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tighten existing affiliate-documents policies to authenticated role only
DROP POLICY IF EXISTS "Affiliates view own docs" ON storage.objects;
CREATE POLICY "Affiliates view own docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'affiliate-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Affiliates upload own docs" ON storage.objects;
CREATE POLICY "Affiliates upload own docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'affiliate-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Affiliates update own docs" ON storage.objects;
CREATE POLICY "Affiliates update own docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'affiliate-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'affiliate-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2. social_proof_templates: limit public exposure to the two display columns only
DROP POLICY IF EXISTS "Public can read templates" ON public.social_proof_templates;
CREATE POLICY "Public can read display templates"
ON public.social_proof_templates FOR SELECT TO anon, authenticated
USING (true);

REVOKE SELECT ON public.social_proof_templates FROM anon;
GRANT SELECT (event_type, template_text) ON public.social_proof_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_proof_templates TO authenticated;
GRANT ALL ON public.social_proof_templates TO service_role;