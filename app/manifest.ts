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
        src: "/giftomat-v3.png?v=20260818-v3",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
