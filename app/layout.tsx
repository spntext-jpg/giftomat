import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Гифтомат",
  description: "Создавайте GIF прямо в браузере",
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
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎞</text></svg>"
        />
      </head>
      <body
        className={[
          "min-h-screen antialiased",
          "bg-slate-50 dark:bg-[#0D0D10]",
          "text-slate-900 dark:text-slate-100",
          "transition-colors duration-300",
        ].join(" ")}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
