"use client";

import { useEffect } from "react";
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // A caching service worker only gets in the way during development
    // (npm run dev / Codespaces preview), so register in production builds only.
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline mode is optional: fail silently.
    });
  }, []);

  return null;
}
