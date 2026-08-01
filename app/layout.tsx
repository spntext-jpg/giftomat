import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

// GIFTOMAT_PREMIUM_POLISH_V1_FONT
// Самохостящийся Inter (app/fonts/InterVariable.woff2) — без обращения к Google Fonts на сборке.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Гифтомат — GIF, PDF и сжатие изображений",
  description: "Локальная студия для GIF, PDF-каруселей LinkedIn и оптимизированных изображений для сайтов.",
  // GIFTOMAT_SPRINT4_V1_METADATA
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Гифтомат",
  },
  icons: {
    icon: [{ url: "/giftomat-favicon-stack-v4.png?v=20260728-v4", type: "image/png", sizes: "512x512" }],
    shortcut: "/giftomat-favicon-stack-v4.png?v=20260728-v4",
    apple: "/giftomat-favicon-stack-v4.png?v=20260728-v4",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111820" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#eef6fb" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <Script src="/gif.js" strategy="beforeInteractive" />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
