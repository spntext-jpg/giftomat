import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Гифтомат — локальная браузерная медиастудия",
    short_name: "Гифтомат",
    description:
      "GIF из изображений и видео, PDF-карусели, HTML в PDF, Crop и оптимизация JPG/WebP — локально в браузере.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#151728",
    icons: [
      {
        src: "/giftomat-icon.png?v=20260828-v8",
        sizes: "1080x1080",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
