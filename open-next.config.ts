import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Static pages (landing, legal) are served from the Worker assets.
// We don't use ISR, so there is no need for R2 or KV.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
