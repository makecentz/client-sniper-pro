
-- Add new columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Create lead_notes table
CREATE TABLE public.lead_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.lead_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.lead_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.lead_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.lead_notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
