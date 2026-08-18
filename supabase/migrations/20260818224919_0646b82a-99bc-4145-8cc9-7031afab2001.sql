CREATE TABLE IF NOT EXISTS public.telegram_admins (
  telegram_id bigint PRIMARY KEY,
  label text,
  added_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_admins TO service_role;

ALTER TABLE public.telegram_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages telegram admins"
  ON public.telegram_admins FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.telegram_admins (telegram_id, label)
VALUES (8358563622, 'owner')
ON CONFLICT (telegram_id) DO NOTHING;