import type { MetadataRoute } from "next";
import { appHref } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeVenue",
    short_name: "VibeVenue",
    description: "Plataforma interativa para estabelecimentos",
    start_url: appHref("/"),
    display: "standalone",
    background_color: "#070b16",
    theme_color: "#7c3aed",
    icons: [
      { src: appHref("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: appHref("/icon-512.png"), sizes: "512x512", type: "image/png" }
    ]
  };
}
