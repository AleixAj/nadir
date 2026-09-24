import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { alertEvent, pricePoint, product, userSettings } from "@/db/schema";
import type { AccountData, AccountSettings, Freq } from "@/lib/account-types";
import { eur } from "@/lib/format";
import { productFromRows, type PointRow } from "@/lib/history";

const TZ = "Europe/Madrid";
const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export async function getSettings(userId: string): Promise<AccountSettings> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return {
    email: row?.emailAlerts ?? true,
    telegram: row?.telegramAlerts ?? false,
    freq: (row?.freq as Freq) ?? "24h",
  };
}

/** Todo lo que necesita la interfaz de una cuenta real. */
export async function getAccountData(user: { id: string; name: string; email: string; image?: string | null }): Promise<AccountData> {
  const now = new Date();
  const rows = await db.select().from(product).where(eq(product.userId, user.id)).orderBy(desc(product.createdAt));
  const ids = rows.map((r) => r.id);

  // Precios del último año
  const since = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000);
  const points = ids.length
    ? await db
        .select({ productId: pricePoint.productId, priceCents: pricePoint.priceCents, checkedAt: pricePoint.checkedAt })
        .from(pricePoint)
        .where(and(inArray(pricePoint.productId, ids), gte(pricePoint.checkedAt, since)))
    : [];
  const byProduct = new Map<string, PointRow[]>();
  for (const p of points) {
    const list = byProduct.get(p.productId) ?? [];
    list.push(p);
    byProduct.set(p.productId, list);
  }

  const events = ids.length
    ? await db
        .select({
          id: alertEvent.id,
          productId: alertEvent.productId,
          priceCents: alertEvent.priceCents,
          channels: alertEvent.channels,
          createdAt: alertEvent.createdAt,
        })
        .from(alertEvent)
        .where(inArray(alertEvent.productId, ids))
        .orderBy(desc(alertEvent.createdAt))
        .limit(50)
    : [];

  const products = rows.map((r) => productFromRows(r, byProduct.get(r.id) ?? [], now));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lastChecked = rows.reduce<Date | null>((acc, r) => (r.lastCheckedAt && (!acc || r.lastCheckedAt > acc) ? r.lastCheckedAt : acc), null);

  return {
    user: { name: user.name, email: user.email, image: user.image ?? null },
    products,
    alerts: Object.fromEntries(rows.map((r) => [r.id, r.alertOn])),
    history: events.map((e) => {
      const p = byId.get(e.productId)!;
      return {
        id: e.id,
        productId: e.productId,
        name: p.name,
        txt: `Bajó a ${eur(e.priceCents / 100)} en ${p.store}`,
        date: dateFmt.format(e.createdAt),
        time: timeFmt.format(e.createdAt),
        channels: e.channels || "En la app",
      };
    }),
    settings: await getSettings(user.id),
    lastCheckMinutes: lastChecked ? Math.round((now.getTime() - lastChecked.getTime()) / 60000) : null,
  };
}
