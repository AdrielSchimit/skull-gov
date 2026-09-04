import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SKULL GOV",
    short_name: "SKULL GOV",
    description: "Radar de oportunidades públicas com análise de aderência, caixa e risco.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f7f5",
    theme_color: "#16a66a",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
