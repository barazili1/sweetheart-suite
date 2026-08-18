import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLATFORMS } from "./config";

export type BotSettings = {
  enabled: boolean;
  channelUrl: string;
  supportUrl: string;
  platform1Url: string;
  platform2Url: string;
  platform3Url: string;
  platform4Url: string;
  promoCode: string;
  appBaseUrl: string | null;
};

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  enabled: true,
  channelUrl: "https://t.me/+KA1g9YjXsmBmZmNk",
  supportUrl: "https://t.me/TOPx111m",
  platform1Url: PLATFORMS.p1.download,
  platform2Url: PLATFORMS.p2.download,
  platform3Url: PLATFORMS.p3.download,
  platform4Url: PLATFORMS.p4.download,
  promoCode: "Gooo33",
  appBaseUrl: null,
};

export async function getBotSettings(): Promise<BotSettings> {
  const { data, error } = await supabaseAdmin
    .from("telegram_bot_settings")
    .select(
      "enabled,channel_url,support_url,platform_1_url,platform_2_url,platform_3_url,platform_4_url,promo_code,app_base_url",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("Could not load Telegram bot settings:", error?.message);
    return DEFAULT_BOT_SETTINGS;
  }

  const row = data as Record<string, any>;
  return {
    enabled: row["enabled"],
    channelUrl: row["channel_url"],
    supportUrl: row["support_url"],
    platform1Url: row["platform_1_url"],
    platform2Url: row["platform_2_url"],
    platform3Url: row["platform_3_url"] ?? PLATFORMS.p3.download,
    platform4Url: row["platform_4_url"] ?? PLATFORMS.p4.download,
    promoCode: row["promo_code"],
    appBaseUrl: row["app_base_url"],
  };
}

type SettingUpdate = Partial<{
  enabled: boolean;
  channel_url: string;
  support_url: string;
  platform_1_url: string;
  platform_2_url: string;
  platform_3_url: string;
  platform_4_url: string;
  promo_code: string;
  app_base_url: string | null;
}>;

export async function updateBotSettings(values: SettingUpdate) {
  const { error } = await supabaseAdmin
    .from("telegram_bot_settings")
    .update(values as any)
    .eq("id", 1);
  if (error) throw new Error(`Could not update bot settings: ${error.message}`);
}
