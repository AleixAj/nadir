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

// Content Security Policy: where the browser may load scripts, images, frames... from.
// Scripts: our own site and Cloudflare Turnstile (the anti-bot check). Next.js adds small
// inline scripts, hence 'unsafe-inline'. Images: any https site (store and Google photos).
// Only in production: the dev server needs eval and websockets for hot reload.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");
if (process.env.NODE_ENV === "production") securityHeaders.push({ key: "Content-Security-Policy", value: csp });

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
