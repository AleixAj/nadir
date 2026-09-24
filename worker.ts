// Cloudflare Worker entry point.
// Serves the app (built by OpenNext) and adds the scheduled price check.
// @ts-expect-error `.open-next/worker.js` is created by the build
import { default as handler } from "./.open-next/worker.js";

interface Env {
  CRON_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export default {
  fetch: handler.fetch,

  // Cron Trigger: calls the protected check route with the secret key
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const base = env.BETTER_AUTH_URL ?? "https://nadir.aleixaj.com";
    const req = new Request(`${base}/api/cron/check`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    ctx.waitUntil(handler.fetch(req, env, ctx));
  },
} satisfies ExportedHandler<Env>;
