import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Гифтомат — GIF, PDF и сжатие изображений",
  description: "Локальная студия для GIF, PDF-каруселей LinkedIn и оптимизированных изображений для сайтов.",
  icons: {
    icon: [{ url: "/giftomat-favicon-stack-v4.png?v=20260728-v4", type: "image/png", sizes: "512x512" }],
    shortcut: "/giftomat-favicon-stack-v4.png?v=20260728-v4",
    apple: "/giftomat-favicon-stack-v4.png?v=20260728-v4",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111820" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#eef6fb" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <Script src="/gif.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
