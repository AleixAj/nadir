// Punto de entrada del Worker de Cloudflare.
// Sirve la app (generada por OpenNext) y añade la tarea programada que revisa precios.
// @ts-expect-error `.open-next/worker.js` se genera al hacer el build
import { default as handler } from "./.open-next/worker.js";

interface Env {
  CRON_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export default {
  fetch: handler.fetch,

  // Cron Trigger: llama a la ruta protegida de revisión con la clave secreta
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const base = env.BETTER_AUTH_URL ?? "https://nadir.aleixaj.com";
    const req = new Request(`${base}/api/cron/check`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    ctx.waitUntil(handler.fetch(req, env, ctx));
  },
} satisfies ExportedHandler<Env>;
