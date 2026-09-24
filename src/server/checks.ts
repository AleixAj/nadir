import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertEvent, pricePoint, product } from "@/db/schema";
import { crossedTarget } from "@/lib/history";
import { fetchProduct } from "./fetch-product";

type ProductRecord = typeof product.$inferSelect;

/**
 * Revisa el precio de un producto: lee su página, guarda el precio y,
 * si ha bajado del objetivo, registra un aviso.
 */
export async function checkProduct(p: ProductRecord): Promise<{ ok: boolean; priceCents?: number; error?: string }> {
  const res = await fetchProduct(p.url);
  const now = new Date();

  if (!res.ok) {
    await db.update(product).set({ lastCheckedAt: now, lastError: res.error }).where(eq(product.id, p.id));
    return { ok: false, error: res.error };
  }

  const [prev] = await db
    .select({ priceCents: pricePoint.priceCents })
    .from(pricePoint)
    .where(eq(pricePoint.productId, p.id))
    .orderBy(desc(pricePoint.checkedAt))
    .limit(1);

  const priceCents = res.info.priceCents;
  await db.insert(pricePoint).values({ productId: p.id, priceCents, checkedAt: now });
  await db
    .update(product)
    .set({ lastCheckedAt: now, lastError: null, image: p.image ?? res.info.image })
    .where(eq(product.id, p.id));

  if (crossedTarget(prev?.priceCents ?? null, priceCents, p.targetCents, p.alertOn)) {
    await db.insert(alertEvent).values({ productId: p.id, priceCents, targetCents: p.targetCents! });
  }
  return { ok: true, priceCents };
}
