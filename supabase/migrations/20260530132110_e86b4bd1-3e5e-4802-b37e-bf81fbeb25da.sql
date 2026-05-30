CREATE TABLE public.failed_signup_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT,
  email TEXT,
  display_name TEXT,
  reason TEXT NOT NULL,
  existing_user_id UUID,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.failed_signup_attempts TO authenticated;
GRANT ALL ON public.failed_signup_attempts TO service_role;

ALTER TABLE public.failed_signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed signup attempts"
ON public.failed_signup_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete failed signup attempts"
ON public.failed_signup_attempts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_failed_signup_attempts_ip ON public.failed_signup_attempts(ip);
CREATE INDEX idx_failed_signup_attempts_created_at ON public.failed_signup_attempts(created_at DESC);