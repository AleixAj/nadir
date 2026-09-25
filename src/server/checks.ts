import "server-only";
import { desc, eq, min } from "drizzle-orm";
import { db } from "@/db";
import { catalogOffer, pricePoint, product } from "@/db/schema";
import { crossedTarget } from "@/lib/history";
import { createAlert } from "./alerts";
import { fetchProduct } from "./fetch-product";
import { nextSimulatedPrice } from "./simulation";

type ProductRecord = typeof product.$inferSelect;

type CheckResult = { ok: boolean; priceCents?: number; error?: string };

// Checks a product's price: reads its page, saves the price and
// creates an alert if it dropped below the target.
// It never throws: an unexpected error is saved on the product, so one bad page
// can't stop the automatic check of everyone else's products.
export async function checkProduct(p: ProductRecord): Promise<CheckResult> {
  try {
    return p.catalogId ? await checkSimulated(p) : await checkStore(p);
  } catch (err) {
    console.error("Price check failed", p.id, err);
    const error = "No hemos podido revisar el precio. Lo intentaremos más tarde.";
    await db
      .update(product)
      .set({ lastCheckedAt: new Date(), lastError: error })
      .where(eq(product.id, p.id))
      .catch(() => {});
    return { ok: false, error };
  }
}

async function checkStore(p: ProductRecord): Promise<CheckResult> {
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
    await createAlert(p.id, priceCents, p.targetCents!);
  }
  return { ok: true, priceCents };
}

// Sample catalog products don't hit the store. The price is simulated
// starting from its real catalog price.
async function checkSimulated(p: ProductRecord) {
  const now = new Date();
  const [prev] = await db
    .select({ priceCents: pricePoint.priceCents })
    .from(pricePoint)
    .where(eq(pricePoint.productId, p.id))
    .orderBy(desc(pricePoint.checkedAt))
    .limit(1);
  const [base] = await db
    .select({ cents: min(catalogOffer.priceCents) })
    .from(catalogOffer)
    .where(eq(catalogOffer.productId, p.catalogId!));
  // Cheapest catalog price, or the last saved price if the catalog has none
  const baseCents = base?.cents ?? prev?.priceCents;
  if (!baseCents) return { ok: false, error: "Producto sin precio en el catálogo." };

  const prevCents = prev?.priceCents ?? baseCents;
  const priceCents = nextSimulatedPrice(prevCents, baseCents, p.id, now);
  await db.insert(pricePoint).values({ productId: p.id, priceCents, checkedAt: now });
  await db.update(product).set({ lastCheckedAt: now, lastError: null }).where(eq(product.id, p.id));
  if (crossedTarget(prevCents, priceCents, p.targetCents, p.alertOn)) {
    await createAlert(p.id, priceCents, p.targetCents!);
  }
  return { ok: true, priceCents };
}
