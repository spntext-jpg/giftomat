import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

// Self-hosted: production builds do not depend on a font CDN.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Гифтомат — GIF, PDF, Crop и сжатие изображений",
  description:
    "Локальная браузерная студия: GIF из изображений и видео, PDF-карусели, HTML в PDF, Crop и оптимизация JPG/WebP.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Гифтомат",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#151728" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F7F8FC" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <Script src="/gif.js" strategy="beforeInteractive" />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
