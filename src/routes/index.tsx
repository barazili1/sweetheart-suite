import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cassa Predictor — Pronostics de jeux crash" },
      {
        name: "description",
        content:
          "Cassa Predictor : pronostics et signaux en temps réel pour Aviator, JetX, Chicken Run, Lucky Jet et autres jeux crash.",
      },
      { property: "og:title", content: "Cassa Predictor — Pronostics de jeux crash" },
      {
        property: "og:description",
        content:
          "Pronostics et signaux en temps réel pour les jeux crash les plus populaires.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    // The original app is launched from its Telegram bot, which passes the
    // interface language. Arabic is forced everywhere.
    throw redirect({ href: "/site/index.html?lang=ar&us=Guest&i=1" });
  },

  component: () => null,
});
