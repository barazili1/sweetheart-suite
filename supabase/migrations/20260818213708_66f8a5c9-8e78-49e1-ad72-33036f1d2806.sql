CREATE TABLE public.telegram_bot_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  channel_url text NOT NULL DEFAULT 'https://t.me/novavip',
  support_url text NOT NULL DEFAULT 'https://t.me/novavip_support',
  platform_1_url text NOT NULL DEFAULT 'https://1xbet.com/',
  platform_2_url text NOT NULL DEFAULT 'https://1xbet.com/',
  promo_code text NOT NULL DEFAULT '1234',
  app_base_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_bot_settings TO service_role;

ALTER TABLE public.telegram_bot_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.telegram_bot_settings (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.set_telegram_bot_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER telegram_bot_settings_updated_at
BEFORE UPDATE ON public.telegram_bot_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_telegram_bot_settings_updated_at();