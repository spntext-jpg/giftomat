import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Гифтомат",
  description: "Создавайте GIF с плавными переходами прямо в браузере",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body
        className="bg-[#FAFAFA] dark:bg-[#121212] text-[#121212] dark:text-white min-h-screen transition-colors duration-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
