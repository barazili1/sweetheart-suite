import languageImage from "@/assets/bot/language.jpg?inline";
import stepsImage from "@/assets/bot/steps.jpg?inline";
import verifiedImage from "@/assets/bot/verified.jpg?inline";
import welcomeImage from "@/assets/bot/welcome.jpg?inline";

export type ImageKey = "welcome" | "language" | "steps" | "verified";

const dataUrls: Record<ImageKey, string> = {
  welcome: welcomeImage,
  language: languageImage,
  steps: stepsImage,
  verified: verifiedImage,
};

/** Raw JPEG bytes for an image, so it can be uploaded straight to Telegram. */
export function imageBytes(key: ImageKey): Uint8Array | null {
  const dataUrl = dataUrls[key];
  if (!dataUrl) return null;
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  return new Uint8Array(Buffer.from(dataUrl.slice(comma + 1), "base64"));
}
