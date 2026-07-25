import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { appHref } from "@/lib/base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeVenue — Experiências interativas para estabelecimentos",
  description: "Música, atendimento, eventos, fidelidade, conteúdo e métricas em uma única plataforma.",
  applicationName: "VibeVenue",
  manifest: appHref("/manifest.webmanifest"),
  icons: { icon: [{ url: appHref("/icon-192.png"), sizes: "192x192", type: "image/png" }, { url: appHref("/icon-512.png"), sizes: "512x512", type: "image/png" }] }
};
export const viewport: Viewport = { themeColor: "#070b16", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}<ServiceWorkerRegister /></body></html>;
}
