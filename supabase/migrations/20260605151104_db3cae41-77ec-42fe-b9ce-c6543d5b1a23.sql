-- user_api_keys
CREATE TABLE public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  encrypted_key TEXT NOT NULL,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_keys TO authenticated;
GRANT ALL ON public.user_api_keys TO service_role;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.user_api_keys
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_api_keys_updated BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chatbots
CREATE TABLE public.chatbots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  brand_color TEXT NOT NULL DEFAULT '#3B82F6',
  logo_url TEXT,
  welcome_message TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant for this business. Answer questions using only the provided knowledge base. If you do not know, say so politely.',
  fallback_message TEXT NOT NULL DEFAULT 'I''m not sure about that. Could you rephrase or contact us directly?',
  openai_assistant_id TEXT,
  openai_vector_store_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message_count INT NOT NULL DEFAULT 0,
  conversation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbots TO authenticated;
GRANT SELECT ON public.chatbots TO anon;
GRANT ALL ON public.chatbots TO service_role;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chatbots" ON public.chatbots
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can read active bots for widget" ON public.chatbots
  FOR SELECT TO anon USING (is_active = true);
CREATE TRIGGER chatbots_updated BEFORE UPDATE ON public.chatbots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chatbot_kb_sources
CREATE TABLE public.chatbot_kb_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('file','url')),
  name TEXT NOT NULL,
  storage_path TEXT,
  source_url TEXT,
  openai_file_id TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chatbot_kb_sources_chatbot_idx ON public.chatbot_kb_sources(chatbot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_kb_sources TO authenticated;
GRANT ALL ON public.chatbot_kb_sources TO service_role;
ALTER TABLE public.chatbot_kb_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kb sources" ON public.chatbot_kb_sources
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER chatbot_kb_sources_updated BEFORE UPDATE ON public.chatbot_kb_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();