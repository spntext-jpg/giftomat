import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Гифтомат · BitGroqs",
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
      <body className="antialiased min-h-screen flex flex-col items-center">
        {children}
      </body>
    </html>
  );
}
