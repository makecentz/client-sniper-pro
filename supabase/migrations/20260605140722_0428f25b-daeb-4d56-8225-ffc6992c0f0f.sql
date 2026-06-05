
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_features_detected text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS has_chatbot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ai_voice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_monthly_revenue_loss numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_monthly_missed_customers integer DEFAULT 0;
