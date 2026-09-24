import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** Security headers sent with every response. */
const securityHeaders = [
  // Only our own site can embed us in an iframe (the landing page shows the app that way)
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
    // Demo images are already optimized WebP and store images are served as they are.
    // On Cloudflare, the Next.js optimizer would need the paid Cloudflare Images service.
    unoptimized: true,
  },
};

export default nextConfig;

// Gives access to Cloudflare bindings during `next dev`
initOpenNextCloudflareForDev();
