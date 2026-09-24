import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de la demo ya están optimizadas (WebP) y las de las tiendas se sirven tal cual.
    // En Cloudflare, el optimizador de Next.js necesitaría el servicio de pago Cloudflare Images.
    unoptimized: true,
  },
};

export default nextConfig;

// Da acceso a los bindings de Cloudflare durante `next dev`
initOpenNextCloudflareForDev();
