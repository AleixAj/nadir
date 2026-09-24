"use server";

// Server Actions called directly from the UI.
// Every action checks the session, and that the product belongs to the user.
import { and, asc, count, desc, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { alertEvent, catalogOffer, catalogProduct, pricePoint, product, userSettings } from "@/db/schema";
import { PRODUCT_LIMIT, type AccountData, type ActionResult } from "@/lib/account-types";
import { getSession } from "@/lib/auth";
import { normalizeText } from "@/lib/catalog";
import { simulatedHistory } from "./simulation";
import { getAccountData } from "./account";
import { checkProduct } from "./checks";
import { fetchProduct } from "./fetch-product";

type SessionUser = { id: string; name: string; email: string; image?: string | null };

async function requireUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

const NO_SESSION = { ok: false as const, error: "Tu sesión ha caducado. Vuelve a entrar." };
const LIMIT_ERROR = `El plan gratuito permite seguir hasta ${PRODUCT_LIMIT} productos.`;

// Sends back the updated account data
async function fresh(user: SessionUser): Promise<ActionResult> {
  return { ok: true, data: await getAccountData(user) };
}

// Only returns the product if it belongs to this user
async function ownProduct(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.userId, userId)));
  return row ?? null;
}

async function reachedLimit(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(product).where(eq(product.userId, userId));
  return n >= PRODUCT_LIMIT;
}

const toCents = (euros: number) => Math.round(euros * 100);

// If the price is already at or below the target when an alert is saved or
// turned on, create the alert now instead of waiting for the next drop.
// Skip it if there's already an alert for that same target.
async function alertIfReached(productId: string, targetCents: number) {
  const [last] = await db
    .select({ priceCents: pricePoint.priceCents })
    .from(pricePoint)
    .where(eq(pricePoint.productId, productId))
    .orderBy(desc(pricePoint.checkedAt))
    .limit(1);
  if (!last || last.priceCents > targetCents) return;
  const [dup] = await db
    .select({ id: alertEvent.id })
    .from(alertEvent)
    .where(and(eq(alertEvent.productId, productId), eq(alertEvent.targetCents, targetCents)))
    .limit(1);
  if (!dup) await db.insert(alertEvent).values({ productId, priceCents: last.priceCents, targetCents });
}

const idSchema = z.string().uuid();
const priceSchema = z.number().positive().max(1_000_000).nullable();

// Read

export async function loadAccount(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  return fresh(user);
}

// Reads the page to show a preview (nothing is saved yet)
export async function previewProduct(url: string): Promise<
  ActionResult<{ url: string; name: string; image: string | null; price: number; store: string }>
> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
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
  list: z.enum(["Tecnología", "Hogar"]),
});

export async function addProduct(input: z.input<typeof addSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { url, target, list } = parsed.data;

  if (await reachedLimit(user.id)) return { ok: false, error: LIMIT_ERROR };

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
      list,
      currency: res.info.currency,
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };

  const productId = inserted[0].id;
  await db.insert(pricePoint).values({ productId, priceCents: res.info.priceCents, checkedAt: now });
  if (targetCents != null) await alertIfReached(productId, targetCents);
  return fresh(user);
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
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  const p = await ownProduct(user.id, id);
  if (!p) return { ok: false, error: "No encontramos este producto." };
  if (p.lastCheckedAt && Date.now() - p.lastCheckedAt.getTime() < 60_000) {
    return { ok: false, error: "Acabamos de revisarlo. Prueba de nuevo en un minuto." };
  }
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
  list: z.enum(["Tecnología", "Hogar"]),
});

// Follow a product from the sample catalog. It gets 90 days of simulated
// history (ending at its real price) so the chart isn't empty on day one.
export async function addFromCatalog(input: z.input<typeof catalogAddSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = catalogAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { catalogId, target, list } = parsed.data;

  if (await reachedLimit(user.id)) return { ok: false, error: LIMIT_ERROR };

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
      list,
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
      catalogId,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };

  const productId = inserted[0].id;
  const history = simulatedHistory(best.priceCents, catalogId, now);
  await db.insert(pricePoint).values(history.map((h) => ({ productId, ...h })));
  if (targetCents != null) await alertIfReached(productId, targetCents);
  return fresh(user);
}
