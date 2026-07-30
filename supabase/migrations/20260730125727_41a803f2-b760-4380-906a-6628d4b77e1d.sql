CREATE TABLE public.app_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_api_keys TO service_role;

ALTER TABLE public.app_api_keys ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_app_api_keys_updated_at
BEFORE UPDATE ON public.app_api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();