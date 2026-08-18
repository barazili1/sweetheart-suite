ALTER TABLE public.telegram_bot_settings
  ADD COLUMN IF NOT EXISTS platform_3_url text NOT NULL DEFAULT 'https://gooobetaffiliate.com/L?tag=d_2787091m_127929c_&site=2787091&ad=127929',
  ADD COLUMN IF NOT EXISTS platform_4_url text NOT NULL DEFAULT 'https://refpa98980.com/L?tag=d_5876143m_68383c_&site=5876143&ad=68383';

UPDATE public.telegram_bot_settings SET
  channel_url = 'https://t.me/+KA1g9YjXsmBmZmNk',
  support_url = 'https://t.me/TOPx111m',
  promo_code = 'Gooo33',
  platform_1_url = 'https://refpazitag.top/L?tag=d_2926243m_54987c_&site=2926243&ad=54987',
  platform_2_url = 'https://refpa22168.com/L?tag=d_3638295m_99042c_&site=3638295&ad=99042',
  platform_3_url = 'https://gooobetaffiliate.com/L?tag=d_2787091m_127929c_&site=2787091&ad=127929',
  platform_4_url = 'https://refpa98980.com/L?tag=d_5876143m_68383c_&site=5876143&ad=68383'
WHERE id = 1;