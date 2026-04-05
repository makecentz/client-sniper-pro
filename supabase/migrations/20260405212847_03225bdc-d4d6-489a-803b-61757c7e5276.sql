-- Add new columns to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_label text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS ai_insight text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS competitor_insight text;

-- Create proposals table
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  pdf_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON public.proposals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
  ON public.proposals FOR DELETE
  USING (auth.uid() = user_id);

-- Create dfy_requests table
CREATE TABLE public.dfy_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dfy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dfy requests"
  ON public.dfy_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dfy requests"
  ON public.dfy_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all dfy requests"
  ON public.dfy_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));