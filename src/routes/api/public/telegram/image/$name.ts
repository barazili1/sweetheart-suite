import { createFileRoute } from "@tanstack/react-router";
import platformsImage from "@/assets/bot/platforms.jpg?inline";
import languageImage from "@/assets/bot/language.jpg?inline";
import stepsImage from "@/assets/bot/steps.jpg?inline";
import verifiedImage from "@/assets/bot/verified.jpg?inline";
import welcomeImage from "@/assets/bot/welcome.jpg?inline";

const images: Record<string, string> = {
  language: languageImage,
  platforms: platformsImage,
  steps: stepsImage,
  verified: verifiedImage,
  welcome: welcomeImage,
};

function imageResponse(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return new Response("Invalid image", { status: 500 });

  const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.byteLength),
    },
  });
}

export const Route = createFileRoute("/api/public/telegram/image/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = images[params.name];
        return image ? imageResponse(image) : new Response("Not found", { status: 404 });
      },
    },
  },
});