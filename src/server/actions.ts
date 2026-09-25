"use server";

// Server Actions called directly from the UI.
// Every action checks the session, and that the product belongs to the user.
import { and, asc, count, desc, eq, gt, isNull, like, lt, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { alertEvent, catalogOffer, catalogProduct, pricePoint, product, userAvatar, userList, userSettings } from "@/db/schema";
import { LIST_LIMIT, PRODUCT_LIMIT, type AccountData, type ActionResult } from "@/lib/account-types";
import { getAuth, getSession } from "@/lib/auth";
import { normalizeText } from "@/lib/catalog";
import { simulatedHistory } from "./simulation";
import { getAccountData } from "./account";
import { checkProduct } from "./checks";
import { createAlert } from "./alerts";
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
// Skip it if we already sent one for this target and the price hasn't gone back up since.
async function alertIfReached(productId: string, targetCents: number) {
  const [last] = await db
    .select({ priceCents: pricePoint.priceCents })
    .from(pricePoint)
    .where(eq(pricePoint.productId, productId))
    .orderBy(desc(pricePoint.checkedAt))
    .limit(1);
  if (!last || last.priceCents > targetCents) return;
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
  await createAlert(productId, last.priceCents, targetCents);
}

// Returns the list id only if that list belongs to the user (otherwise no list)
async function ownListId(userId: string, listId: string | null) {
  if (!listId) return null;
  const [row] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.userId, userId)));
  return row?.id ?? null;
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
  const [{ n }] = await db.select({ n: count() }).from(product).where(eq(product.userId, userId));
  if (n <= PRODUCT_LIMIT) return false;
  await db.delete(product).where(eq(product.id, productId));
  return true;
}

const SAVE_ERROR = "No hemos podido guardar el producto. Inténtalo de nuevo.";

const idSchema = z.string().uuid();
const listIdSchema = z.string().min(1).max(64).nullable();
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
  listId: listIdSchema,
});

export async function addProduct(input: z.input<typeof addSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { url, target, listId } = parsed.data;

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
      listId: await ownListId(user.id, listId),
      currency: res.info.currency,
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };

  const productId = inserted[0].id;
  if (await overLimitAfterInsert(user.id, productId)) return { ok: false, error: LIMIT_ERROR };
  if (!(await savePricesOrUndo(productId, [{ priceCents: res.info.priceCents, checkedAt: now }]))) {
    return { ok: false, error: SAVE_ERROR };
  }
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
  const parsed = catalogAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { catalogId, target, listId } = parsed.data;

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
      listId: await ownListId(user.id, listId),
      targetCents,
      alertOn: targetCents != null,
      lastCheckedAt: now,
      catalogId,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };

  const productId = inserted[0].id;
  if (await overLimitAfterInsert(user.id, productId)) return { ok: false, error: LIMIT_ERROR };
  const history = simulatedHistory(best.priceCents, catalogId, now);
  if (!(await savePricesOrUndo(productId, history))) return { ok: false, error: SAVE_ERROR };
  if (targetCents != null) await alertIfReached(productId, targetCents);
  return fresh(user);
}

// Profile

// Saves the change through Better Auth, so the session cookie gets the new name or photo too
async function saveUser(user: SessionUser, changes: { name?: string; image?: string | null }): Promise<ActionResult> {
  await getAuth().api.updateUser({ body: changes, headers: await headers() });
  return fresh({ ...user, ...changes });
}

const nameSchema = z.string().trim().min(1).max(60);

export async function updateName(name: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: "Escribe un nombre de 1 a 60 caracteres." };
  return saveUser(user, { name: parsed.data });
}

// The browser sends the photo already cropped to 256x256, so it's small.
// We still check the size and that the bytes really are an image.
const MAX_AVATAR_BYTES = 150 * 1024;
const AVATAR_TYPES = ["image/webp", "image/jpeg", "image/png"];

function looksLikeImage(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(1, 4).toString("ascii") === "PNG";
  // WebP files start with "RIFF", then the size, then "WEBP"
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function uploadAvatar(dataUrl: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;

  // Expected format: "data:image/webp;base64,AAAA..."
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const type = match?.[1] ?? "";
  if (!match || !AVATAR_TYPES.includes(type)) return { ok: false, error: "La imagen tiene que ser JPG, PNG o WebP." };
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_AVATAR_BYTES) return { ok: false, error: "La imagen es demasiado grande." };
  if (!looksLikeImage(bytes, type)) return { ok: false, error: "El archivo no parece una imagen válida." };

  const values = { userId: user.id, contentType: type, data: match[2], updatedAt: new Date() };
  await db.insert(userAvatar).values(values).onConflictDoUpdate({ target: userAvatar.userId, set: values });
  // "?v=" changes on every upload, so browsers don't show the old cached photo
  return saveUser(user, { image: `/api/avatar/${user.id}?v=${Date.now()}` });
}

// Back to the default avatar (the user's initials)
export async function removeAvatar(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  await db.delete(userAvatar).where(eq(userAvatar.userId, user.id));
  return saveUser(user, { image: null });
}

// Lists

const listSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const LIST_INPUT_ERROR = "Escribe un nombre de 1 a 30 caracteres y elige un color.";
const LIST_NAME_TAKEN = "Ya tienes una lista con ese nombre.";

// Postgres error 23505: a unique index rejected the row (e.g. two lists with the same name)
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// True if the user already has another list with this name (ignoring case)
async function listNameTaken(userId: string, name: string, exceptId?: string) {
  const rows = await db.select({ id: userList.id, name: userList.name }).from(userList).where(eq(userList.userId, userId));
  return rows.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
}

export async function createList(input: z.input<typeof listSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: LIST_INPUT_ERROR };

  const [{ n }] = await db.select({ n: count() }).from(userList).where(eq(userList.userId, user.id));
  if (n >= LIST_LIMIT) return { ok: false, error: `Puedes tener hasta ${LIST_LIMIT} listas.` };
  if (await listNameTaken(user.id, parsed.data.name)) return { ok: false, error: LIST_NAME_TAKEN };

  try {
    await db.insert(userList).values({ userId: user.id, ...parsed.data });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: LIST_NAME_TAKEN };
    throw err;
  }
  return fresh(user);
}

export async function updateList(input: z.input<typeof listSchema> & { id: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success || !listIdSchema.safeParse(input.id).success) return { ok: false, error: LIST_INPUT_ERROR };
  if (await listNameTaken(user.id, parsed.data.name, input.id)) return { ok: false, error: LIST_NAME_TAKEN };

  try {
    await db
      .update(userList)
      .set(parsed.data)
      .where(and(eq(userList.id, input.id), eq(userList.userId, user.id)));
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: LIST_NAME_TAKEN };
    throw err;
  }
  return fresh(user);
}

// Deletes the list. Its products are kept, just without a list (the foreign key sets it to null)
export async function deleteList(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!listIdSchema.safeParse(id).success) return { ok: false, error: "Lista no válida." };
  await db.delete(userList).where(and(eq(userList.id, id), eq(userList.userId, user.id)));
  return fresh(user);
}

// Moves a product to another list (or to no list)
export async function moveProduct(input: { id: string; listId: string | null }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(input.id).success || !listIdSchema.safeParse(input.listId).success) {
    return { ok: false, error: "Datos no válidos." };
  }
  if (!(await ownProduct(user.id, input.id))) return { ok: false, error: "No encontramos este producto." };

  const listId = await ownListId(user.id, input.listId);
  await db.update(product).set({ listId }).where(and(eq(product.id, input.id), eq(product.userId, user.id)));
  return fresh(user);
}
