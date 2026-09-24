"use server";

// Acciones que la interfaz llama directamente (Server Actions).
// Todas comprueban la sesión y que el producto sea del usuario.
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pricePoint, product, userSettings } from "@/db/schema";
import { PRODUCT_LIMIT, type AccountData, type ActionResult } from "@/lib/account-types";
import { getSession } from "@/lib/auth";
import { getAccountData } from "./account";
import { checkProduct } from "./checks";
import { fetchProduct } from "./fetch-product";

type SessionUser = { id: string; name: string; email: string; image?: string | null };

async function requireUser(): Promise<SessionUser | null> {
  const s = await getSession();
  return s?.user ?? null;
}

const NO_SESSION = { ok: false as const, error: "Tu sesión ha caducado. Vuelve a entrar." };

async function fresh(user: SessionUser): Promise<ActionResult> {
  return { ok: true, data: await getAccountData(user) };
}

async function ownProduct(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.userId, userId)));
  return row ?? null;
}

const idSchema = z.string().uuid();
const priceSchema = z.number().positive().max(1_000_000).nullable();

/* ─── Lectura ───────────────────────────────────────────────── */

export async function loadAccount(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  return fresh(user);
}

/** Lee la página de la URL para enseñar la vista previa (todavía no guarda nada). */
export async function previewProduct(url: string): Promise<
  ActionResult<{ url: string; name: string; image: string | null; price: number; store: string }>
> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
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

/* ─── Escritura ─────────────────────────────────────────────── */

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

  const [{ n }] = await db.select({ n: count() }).from(product).where(eq(product.userId, user.id));
  if (n >= PRODUCT_LIMIT) return { ok: false, error: `El plan gratuito permite seguir hasta ${PRODUCT_LIMIT} productos.` };

  // Se vuelve a leer la página: no nos fiamos de datos que vengan del navegador
  const res = await fetchProduct(url);
  if (!res.ok) return { ok: false, error: res.error };

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
      targetCents: target != null ? Math.round(target * 100) : null,
      alertOn: target != null,
      lastCheckedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (!inserted.length) return { ok: false, error: "Ya sigues este producto." };

  await db.insert(pricePoint).values({ productId: inserted[0].id, priceCents: res.info.priceCents, checkedAt: now });
  return fresh(user);
}

export async function saveAlert(input: { id: string; target: number; on: boolean }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  const parsed = z.object({ id: idSchema, target: z.number().positive().max(1_000_000), on: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Precio no válido." };
  const p = await ownProduct(user.id, parsed.data.id);
  if (!p) return { ok: false, error: "No encontramos este producto." };

  await db
    .update(product)
    .set({ targetCents: Math.round(parsed.data.target * 100), alertOn: parsed.data.on })
    .where(eq(product.id, p.id));
  return fresh(user);
}

export async function toggleAlert(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  const p = await ownProduct(user.id, id);
  if (!p) return { ok: false, error: "No encontramos este producto." };
  if (p.targetCents == null) return { ok: false, error: "Primero elige un precio objetivo en la ficha del producto." };

  await db.update(product).set({ alertOn: !p.alertOn }).where(eq(product.id, p.id));
  return fresh(user);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  // Los precios y avisos se borran en cascada
  await db.delete(product).where(and(eq(product.id, id), eq(product.userId, user.id)));
  return fresh(user);
}

/** "Revisar ahora": como mucho una vez por minuto y producto. */
export async function checkNow(id: string): Promise<ActionResult<AccountData> & { checkError?: string }> {
  const user = await requireUser();
  if (!user) return NO_SESSION;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto no válido." };
  const p = await ownProduct(user.id, id);
  if (!p) return { ok: false, error: "No encontramos este producto." };
  if (p.lastCheckedAt && Date.now() - p.lastCheckedAt.getTime() < 60_000) {
    return { ok: false, error: "Acabamos de revisarlo. Prueba de nuevo en un minuto." };
  }
  const r = await checkProduct(p);
  const data = await getAccountData(user);
  return { ok: true, data, checkError: r.ok ? undefined : r.error };
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
  const values = {
    ...(email !== undefined && { emailAlerts: email }),
    ...(telegram !== undefined && { telegramAlerts: telegram }),
    ...(freq !== undefined && { freq }),
  };
  if (Object.keys(values).length === 0) return fresh(user);
  await db
    .insert(userSettings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
  return fresh(user);
}
