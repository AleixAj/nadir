"use server";

// Server Actions for products: add, check, alerts, settings and catalog search.
// Every action checks the session, and that the product belongs to the user.
// List and profile actions are in list-actions.ts and profile-actions.ts.
import { and, asc, count, desc, eq, gt, isNull, like, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { alertEvent, catalogOffer, catalogProduct, pricePoint, product, userSettings } from "@/db/schema";
import { PRODUCT_LIMIT, type AccountData, type ActionResult } from "@/lib/account-types";
import { normalizeText } from "@/lib/catalog";
import { simulatedHistory } from "./simulation";
import { getAccountData } from "./account";
import { checkProduct, lastPriceCents } from "./checks";
import { createAlert } from "./alerts";
import { fetchProduct } from "./fetch-product";
import { allow, TOO_MANY } from "./limits";
import { fresh, idSchema, listIdSchema, NO_SESSION, ownListId, ownProduct, requireUser, type SessionUser } from "./action-utils";

const LIMIT_ERROR = `El plan gratuito permite seguir hasta ${PRODUCT_LIMIT} productos.`;

async function countProducts(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(product).where(eq(product.userId, userId));
  return n;
}

const toCents = (euros: number) => Math.round(euros * 100);

// If the price is already at or below the target when an alert is saved or
// turned on, create the alert now instead of waiting for the next drop.
// Skip it if we already sent one for this target and the price hasn't gone back up since.
async function alertIfReached(productId: string, targetCents: number) {
  const lastCents = await lastPriceCents(productId);
  if (lastCents == null || lastCents > targetCents) return;
  const [lastAlert] = await db
    .select({ createdAt: alertEvent.createdAt })
    .from(alertEvent)
    .where(and(eq(alertEvent.productId, productId), eq(alertEvent.targetCents, targetCents)))
    .orderBy(desc(alertEvent.createdAt))
    .limit(1);
  if (lastAlert) {
    // Was the price above the target at some point after that alert?
    const [wentUp] = await db
      .select({ id: pricePoint.id })
      .from(pricePoint)
      .where(
        and(
          eq(pricePoint.productId, productId),
          gt(pricePoint.checkedAt, lastAlert.createdAt),
          gt(pricePoint.priceCents, targetCents),
        ),
      )
      .limit(1);
    if (!wentUp) return;
  }
  await createAlert(productId, lastCents, targetCents);
}

// Saves the first prices of a new product. If that fails, the product is removed
// again so it never shows up without a price.
async function savePricesOrUndo(productId: string, points: { priceCents: number; checkedAt: Date }[]) {
  try {
    await db.insert(pricePoint).values(points.map((pt) => ({ productId, ...pt })));
    return true;
  } catch (err) {
    console.error("Could not save the first price", productId, err);
    await db.delete(product).where(eq(product.id, productId));
    return false;
  }
}

// Two requests at the same time could both pass the limit check, so we count
// again after inserting and undo it if the user went over the limit.
async function overLimitAfterInsert(userId: string, productId: string) {
  if ((await countProducts(userId)) <= PRODUCT_LIMIT) return false;
  await db.delete(product).where(eq(product.id, productId));
  return true;
}

// Last steps of adding a product (from a link or from the catalog) once its row is inserted:
// check the limit again, save its first prices and create the alert if the target is already reached
async function finishAdding(
  user: SessionUser,
  inserted: { id: string }[],
  points: { priceCents: number; checkedAt: Date }[],
  targetCents: number | null,
): Promise<ActionResult> {
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };
  const productId = inserted[0].id;
  if (await overLimitAfterInsert(user.id, productId)) return { ok: false, error: LIMIT_ERROR };
  if (!(await savePricesOrUndo(productId, points))) {
    return { ok: false, error: "No hemos podido guardar el producto. Inténtalo de nuevo." };
  }
  if (targetCents != null) await alertIfReached(productId, targetCents);
  return fresh(user);
}

const priceSchema = z.number().positive().max(1_000_000).nullable();

// Read

// Reads the page to show a preview (nothing is saved yet)
export async function previewProduct(url: string): Promise<
  ActionResult<{ url: string; name: string; image: string | null; price: number; store: string }>
> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`fetch:${user.id}`, 20, 60))) return { ok: false, error: TOO_MANY };
  if (!z.string().url().max(2000).safeParse(url).success) return { ok: false, error: "No es una dirección web válida." };
  const res = await fetchProduct(url);
  if (!res.ok) return { ok: false, error: res.error };

  const [dup] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.userId, user.id), eq(product.url, res.url)));
  if (dup) return { ok: false, error: "Ya sigues este producto." };

  return {
    ok: true,
    data: { url: res.url, name: res.info.name, image: res.info.image, price: res.info.priceCents / 100, store: res.store },
  };
}

// Write

const addSchema = z.object({
  url: z.string().url().max(2000),
  target: priceSchema,
  listId: listIdSchema,
});

export async function addProduct(input: z.input<typeof addSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`fetch:${user.id}`, 20, 60))) return { ok: false, error: TOO_MANY };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { url, target, listId } = parsed.data;

  if ((await countProducts(user.id)) >= PRODUCT_LIMIT) return { ok: false, error: LIMIT_ERROR };

  // Read the page again on the server: never trust data sent by the browser
  const res = await fetchProduct(url);
  if (!res.ok) return { ok: false, error: res.error };

  const targetCents = target != null ? toCents(target) : null;
  const now = new Date();
  const inserted = await db
    .insert(product)
    .values({
      userId: user.id,
      url: res.url,
      store: res.store,
      name: res.info.name,
      image: res.info.image,
      listId: await ownListId(user.id, listId),
      currency: res.info.currency,
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  return finishAdding(user, inserted, [{ priceCents: res.info.priceCents, checkedAt: now }], targetCents);
}

const alertSchema = z.object({ id: idSchema, target: z.number().positive().max(1_000_000), on: z.boolean() });

export async function saveAlert(input: { id: string; target: number; on: boolean }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Precio no válido." };
  const p = await ownProduct(user.id, parsed.data.id);
  if (!p) return { ok: false, error: "No encontramos este producto." };

  const targetCents = toCents(parsed.data.target);
  await db.update(product).set({ targetCents, alertOn: parsed.data.on }).where(eq(product.id, p.id));
  if (parsed.data.on) await alertIfReached(p.id, targetCents);
  return fresh(user);
}

export async function toggleAlert(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  const p = await ownProduct(user.id, id);
  if (!p) return { ok: false, error: "No encontramos este producto." };
  if (p.targetCents == null) return { ok: false, error: "Primero elige un precio objetivo en la ficha del producto." };

  const turningOn = !p.alertOn;
  await db.update(product).set({ alertOn: turningOn }).where(eq(product.id, p.id));
  if (turningOn) await alertIfReached(p.id, p.targetCents);
  return fresh(user);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  // Prices and alerts get deleted too (on delete cascade)
  await db.delete(product).where(and(eq(product.id, id), eq(product.userId, user.id)));
  return fresh(user);
}

// "Check now" button, max once per minute per product
export async function checkNow(id: string): Promise<ActionResult<AccountData> & { checkError?: string }> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`check:${user.id}`, 30, 60))) return { ok: false, error: TOO_MANY };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  if (!(await ownProduct(user.id, id))) return { ok: false, error: "No encontramos este producto." };
  // Mark it as checked only if the last check was over a minute ago. Doing it in one
  // update means several clicks at the same time can't all start a check.
  const [p] = await db
    .update(product)
    .set({ lastCheckedAt: new Date() })
    .where(
      and(
        eq(product.id, id),
        eq(product.userId, user.id),
        or(isNull(product.lastCheckedAt), lt(product.lastCheckedAt, new Date(Date.now() - 60_000))),
      ),
    )
    .returning();
  if (!p) return { ok: false, error: "Acabamos de revisarlo. Prueba de nuevo en un minuto." };
  const result = await checkProduct(p);
  const data = await getAccountData(user);
  return { ok: true, data, checkError: result.ok ? undefined : result.error };
}

const settingsSchema = z.object({
  email: z.boolean().optional(),
  telegram: z.boolean().optional(),
  freq: z.enum(["1h", "6h", "24h"]).optional(),
});

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ajuste no válido." };
  const { email, telegram, freq } = parsed.data;

  // Only save the fields that were sent
  const values: { emailAlerts?: boolean; telegramAlerts?: boolean; freq?: string } = {};
  if (email !== undefined) values.emailAlerts = email;
  if (telegram !== undefined) values.telegramAlerts = telegram;
  if (freq !== undefined) values.freq = freq;
  if (Object.keys(values).length === 0) return fresh(user);

  await db
    .insert(userSettings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
  return fresh(user);
}

// Search by name (sample catalog)

export interface SearchHit {
  /** Product id in the catalog */
  id: string;
  name: string;
  image: string | null;
  list: string;
  /** Cheapest store and its price */
  store: string;
  price: number;
  /** Number of stores that sell it */
  stores: number;
}

// Search the catalog. Every word has to match (ignores accents and case)
export async function searchProducts(q: string): Promise<ActionResult<{ available: boolean; hits: SearchHit[] }>> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`search:${user.id}`, 60, 60))) return { ok: false, error: TOO_MANY };
  if (typeof q !== "string") return { ok: false, error: "Búsqueda no válida." };
  // Strip LIKE wildcards (% and _) so they don't change the search
  const text = normalizeText(q).replace(/[%_\\]/g, "").slice(0, 80);
  if (text.length < 2) return { ok: true, data: { available: true, hits: [] } };
  const words = text.split(" ").filter(Boolean).slice(0, 6);

  const rows = await db
    .select({
      id: catalogProduct.id,
      name: catalogProduct.name,
      image: catalogProduct.image,
      list: catalogProduct.list,
      price: sql<number>`min(${catalogOffer.priceCents})`,
      store: sql<string>`(array_agg(${catalogOffer.store} order by ${catalogOffer.priceCents}))[1]`,
      stores: sql<number>`count(*)`,
    })
    .from(catalogProduct)
    .innerJoin(catalogOffer, eq(catalogOffer.productId, catalogProduct.id))
    .where(and(...words.map((w) => like(catalogProduct.searchText, `%${w}%`))))
    .groupBy(catalogProduct.id)
    // Names that start with the query first, then shorter names (closer matches)
    .orderBy(sql`case when ${catalogProduct.searchText} like ${text + "%"} then 0 else 1 end`, sql`length(${catalogProduct.name})`)
    .limit(8);

  return {
    ok: true,
    data: {
      available: true,
      hits: rows.map((r) => ({ ...r, price: Number(r.price) / 100, stores: Number(r.stores) })),
    },
  };
}

const catalogAddSchema = z.object({
  catalogId: z.string().min(1).max(120),
  target: priceSchema,
  listId: listIdSchema,
});

// Follow a product from the sample catalog. It gets 90 days of simulated
// history (ending at its real price) so the chart isn't empty on day one.
export async function addFromCatalog(input: z.input<typeof catalogAddSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!(await allow(`add:${user.id}`, 20, 60))) return { ok: false, error: TOO_MANY };
  const parsed = catalogAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { catalogId, target, listId } = parsed.data;

  if ((await countProducts(user.id)) >= PRODUCT_LIMIT) return { ok: false, error: LIMIT_ERROR };

  const [item] = await db.select().from(catalogProduct).where(eq(catalogProduct.id, catalogId));
  if (!item) return { ok: false, error: "No encontramos este producto en el catálogo." };
  const offers = await db.select().from(catalogOffer).where(eq(catalogOffer.productId, catalogId)).orderBy(asc(catalogOffer.priceCents));
  const best = offers[0];
  if (!best) return { ok: false, error: "Este producto no tiene precios en el catálogo." };

  const [dup] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.userId, user.id), eq(product.catalogId, catalogId)));
  if (dup) return { ok: false, error: "Ya sigues este producto." };

  const targetCents = target != null ? toCents(target) : null;
  const now = new Date();
  const inserted = await db
    .insert(product)
    .values({
      userId: user.id,
      url: best.url || `catalogo:${catalogId}`,
      store: best.store,
      name: item.name,
      image: item.image,
      listId: await ownListId(user.id, listId),
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
      catalogId,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  return finishAdding(user, inserted, simulatedHistory(best.priceCents, catalogId, now), targetCents);
}
