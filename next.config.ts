import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** Cabeceras de seguridad para todas las respuestas. */
const securityHeaders = [
  // Nadie puede meter la web en un iframe salvo ella misma (la landing enseña la app así)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Las fotos de la demo ya están optimizadas (WebP) y las de las tiendas se sirven tal cual.
    // En Cloudflare, el optimizador de Next.js necesitaría el servicio de pago Cloudflare Images.
    unoptimized: true,
  },
};

export default nextConfig;

// Da acceso a los bindings de Cloudflare durante `next dev`
initOpenNextCloudflareForDev();
