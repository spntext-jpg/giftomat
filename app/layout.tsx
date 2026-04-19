import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Гифтомат",
  description: "Профессиональный генератор GIF из изображений",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* african turquoise text on dark, white on dark. transition. */}
      <body className="antialiased min-h-screen transition-colors duration-500 text-[#000000] dark:text-white bg-white dark:bg-[#0A0A0B] flex flex-col items-center">
        {children}
      </body>
    </html>
  );
}
