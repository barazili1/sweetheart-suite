import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BotSettings = {
  enabled: boolean;
  channelUrl: string;
  supportUrl: string;
  platform1Url: string;
  platform2Url: string;
  promoCode: string;
  appBaseUrl: string | null;
};

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  enabled: true,
  channelUrl: "https://t.me/novavip",
  supportUrl: "https://t.me/novavip_support",
  platform1Url: "https://1xbet.com/",
  platform2Url: "https://1xbet.com/",
  promoCode: "1234",
  appBaseUrl: null,
};

export async function getBotSettings(): Promise<BotSettings> {
  const { data, error } = await supabaseAdmin
    .from("telegram_bot_settings")
    .select("enabled,channel_url,support_url,platform_1_url,platform_2_url,promo_code,app_base_url")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("Could not load Telegram bot settings:", error?.message);
    return DEFAULT_BOT_SETTINGS;
  }

  return {
    enabled: data.enabled,
    channelUrl: data.channel_url,
    supportUrl: data.support_url,
    platform1Url: data.platform_1_url,
    platform2Url: data.platform_2_url,
    promoCode: data.promo_code,
    appBaseUrl: data.app_base_url,
  };
}

type SettingUpdate = Partial<{
  enabled: boolean;
  channel_url: string;
  support_url: string;
  platform_1_url: string;
  platform_2_url: string;
  promo_code: string;
  app_base_url: string | null;
}>;

export async function updateBotSettings(values: SettingUpdate) {
  const { error } = await supabaseAdmin
    .from("telegram_bot_settings")
    .update(values)
    .eq("id", 1);
  if (error) throw new Error(`Could not update bot settings: ${error.message}`);
}