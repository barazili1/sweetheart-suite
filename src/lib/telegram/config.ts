/**
 * NOVA VIP bot configuration.
 * Edit the links below at any time — no other file needs to change.
 *
 * The public base URL is resolved at request time so the same code works on
 * the Lovable preview, on Vercel, and on any custom domain:
 *   1. PUBLIC_BASE_URL     (set this in Vercel → Settings → Environment Variables)
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (set automatically by Vercel)
 *   3. the fallback below (Lovable preview)
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
    steps: `${base}/api/public/telegram/image/steps`,
    verified: `${base}/api/public/telegram/image/verified`,
  };
}

/** Link to the predictions site, carrying the player's platform ID. */
export function appUrl(lang: Lang, id?: string, name?: string, configuredBaseUrl?: string | null) {
  const params = new URLSearchParams({ lang: "ar" });
  params.set("us", name && name.trim() ? name.trim() : "Guest");
  params.set("i", id && /^\d{10,14}$/.test(id) ? id : "1");
  params.set("ui", lang);
  const base = configuredBaseUrl?.trim().replace(/\/+$/, "") || baseUrl();
  return `${base}/site/index.html?${params.toString()}`;
}

/** Telegram channel users must join. */
export const CHANNEL_URL = "https://t.me/novavip";
/** Support contact. */
export const SUPPORT_URL = "https://t.me/novavip_support";

export const PROMO_CODE = "1234";

export const PLATFORMS = {
  p1: { key: "p1", name: "1xBet", download: "https://1xbet.com/" },
  p2: { key: "p2", name: "1xBet2", download: "https://1xbet.com/" },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;
export type Lang = "en" | "ar";
