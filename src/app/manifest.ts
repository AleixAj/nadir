import type { MetadataRoute } from "next";

// Lets users install Nadir as an app (PWA) on mobile or desktop
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nadir · Monitor de precios",
    short_name: "Nadir",
    description: "Sigue el precio de tus productos en varias tiendas y recibe avisos cuando bajen.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    lang: "es",
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed version with padding, so Android can crop it into a circle or squircle
      { src: "/logo-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
