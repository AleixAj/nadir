import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Las páginas estáticas (landing, legales) se sirven desde los assets del Worker.
// No usamos ISR, así que no hace falta R2 ni KV.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
