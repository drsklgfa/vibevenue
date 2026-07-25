"use client";
import { useEffect } from "react";
import { APP_BASE_PATH, appHref } from "@/lib/base-path";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === "true" || !("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register(appHref("/sw.js"), { scope: `${APP_BASE_PATH || ""}/` }).catch(() => undefined); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
