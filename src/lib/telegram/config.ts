/**
 * NOVA VIP bot configuration.
 * Edit the links below at any time — no other file needs to change.
 */

export const BOT_NAME = "NOVA VIP";

const FALLBACK_BASE_URL =
  "https://project--6e37f677-0c61-4a65-bba9-b3ff4c6103c0-dev.lovable.app";

/** Must be called inside a server handler (env is injected per request). */
export function baseUrl(): string {
  const explicit = process.env["PUBLIC_BASE_URL"];
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel =
    process.env["VERCEL_PROJECT_PRODUCTION_URL"] ?? process.env["VERCEL_URL"];
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return FALLBACK_BASE_URL;
}

export function images() {
  const base = baseUrl();
  return {
    welcome: `${base}/api/public/telegram/image/welcome`,
    language: `${base}/api/public/telegram/image/language`,
    platforms: `${base}/api/public/telegram/image/platforms`,
    steps: `${base}/api/public/telegram/image/steps`,
    verified: `${base}/api/public/telegram/image/verified`,
  };
}

/** Public Mini App (opens inside Telegram). */
export const APP_URL = "https://nova-vip-one.vercel.app";

/** Link to the predictions site, carrying the player's platform ID. */
export function appUrl(lang: Lang, id?: string, name?: string, configuredBaseUrl?: string | null) {
  const params = new URLSearchParams({ lang: "ar" });
  params.set("us", name && name.trim() ? name.trim() : "Guest");
  params.set("i", id && /^\d{10,14}$/.test(id) ? id : "1");
  params.set("ui", lang);
  const base = configuredBaseUrl?.trim().replace(/\/+$/, "") || APP_URL;
  return `${base}/?${params.toString()}`;
}

/** Telegram channel users must join. */
export const CHANNEL_URL = "https://t.me/+KA1g9YjXsmBmZmNk";
/** Support contact. */
export const SUPPORT_URL = "https://t.me/TOPx111m";

export const PROMO_CODE = "Gooo33";

export const PLATFORMS = {
  p1: {
    key: "p1",
    name: "Megapari",
    emoji: "🔵",
    download: "https://refpazitag.top/L?tag=d_2926243m_54987c_&site=2926243&ad=54987",
  },
  p2: {
    key: "p2",
    name: "PariPulse",
    emoji: "🔴",
    download: "https://refpa22168.com/L?tag=d_3638295m_99042c_&site=3638295&ad=99042",
  },
  p3: {
    key: "p3",
    name: "GoooBet",
    emoji: "🔷",
    download: "https://gooobetaffiliate.com/L?tag=d_2787091m_127929c_&site=2787091&ad=127929",
  },
  p4: {
    key: "p4",
    name: "WinWin",
    emoji: "🟢",
    download: "https://refpa98980.com/L?tag=d_5876143m_68383c_&site=5876143&ad=68383",
  },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;
export type Lang = "en" | "ar";
