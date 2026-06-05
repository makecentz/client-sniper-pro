CREATE POLICY "Users read own kb files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chatbot-kb' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own kb files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chatbot-kb' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own kb files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chatbot-kb' AND auth.uid()::text = (storage.foldername(name))[1]);