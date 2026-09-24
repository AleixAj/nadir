import { asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { product, userSettings } from "@/db/schema";
import { checkProduct } from "@/server/checks";

// Revisión automática de precios. La llama una tarea programada con:
//   Authorization: Bearer <CRON_SECRET>
// Revisa los productos que "tocan" según la frecuencia de cada usuario.

const BATCH = 20;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  // Frecuencia del usuario (24 h si no la ha cambiado) → umbral de "última revisión"
  const hours = sql<number>`case coalesce(${userSettings.freq}, '24h') when '1h' then 1 when '6h' then 6 else 24 end`;
  const due = await db
    .select({ p: product })
    .from(product)
    .leftJoin(userSettings, eq(userSettings.userId, product.userId))
    .where(
      or(
        isNull(product.lastCheckedAt),
        lt(product.lastCheckedAt, sql`now() - (${hours} * interval '1 hour') + interval '5 minutes'`),
      ),
    )
    .orderBy(asc(product.lastCheckedAt))
    .limit(BATCH);

  let ok = 0;
  const failed: { id: string; error?: string }[] = [];
  for (const { p } of due) {
    const r = await checkProduct(p);
    if (r.ok) ok++;
    else failed.push({ id: p.id, error: r.error });
    // Una pausa corta entre peticiones para no saturar a las tiendas
    await new Promise((res) => setTimeout(res, 800));
  }

  return Response.json({ checked: due.length, ok, failed, ms: Date.now() - now });
}

// Evita que Next.js intente prerenderizar esta ruta
export const dynamic = "force-dynamic";
