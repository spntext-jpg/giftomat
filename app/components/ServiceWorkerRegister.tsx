"use client";

import { useEffect } from "react";
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // В деве (npm run dev / Codespaces preview) кеширующий SW только мешает —
    // регистрируем только на проде (реальный Vercel-деплой).
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Офлайн-режим — необязательная возможность, тихо отступаем при ошибке.
    });
  }, []);

  return null;
}
