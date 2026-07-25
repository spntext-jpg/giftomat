import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giftomat — GIF, PDF и сжатие изображений",
  description: "Локальная обработка изображений: GIF для X, PDF-карусели LinkedIn и лёгкие JPG для сайтов.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#06182b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#dff3ff" media="(prefers-color-scheme: light)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Script src="/gif.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
