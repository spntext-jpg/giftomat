import type { MetadataRoute } from "next";

// GIFTOMAT_SPRINT4_V1_MANIFEST
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Гифтомат — GIF, PDF и сжатие изображений",
    short_name: "Гифтомат",
    description:
      "Локальная студия для GIF, PDF-каруселей LinkedIn и оптимизированных изображений. Работает офлайн, ничего не загружается на сервер.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111820",
    theme_color: "#111820",
    icons: [
      {
        src: "/giftomat-favicon-stack-v4.png?v=20260728-v4",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
