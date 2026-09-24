import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertEvent, catalogOffer, pricePoint, product, userSettings } from "@/db/schema";
import type { AccountData, AccountSettings, Freq } from "@/lib/account-types";
import { eur } from "@/lib/format";
import { productFromRows, type PointRow } from "@/lib/history";

const TZ = "Europe/Madrid";
const DAY = 24 * 60 * 60 * 1000;
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

// Latest check time across all products (null if none was checked yet)
function latestCheck(rows: { lastCheckedAt: Date | null }[]): Date | null {
  let latest: Date | null = null;
  for (const r of rows) {
    if (r.lastCheckedAt && (!latest || r.lastCheckedAt > latest)) latest = r.lastCheckedAt;
  }
  return latest;
}

// Everything the UI needs for a real (logged in) account
export async function getAccountData(user: { id: string; name: string; email: string; image?: string | null }): Promise<AccountData> {
  const now = new Date();
  const rows = await db.select().from(product).where(eq(product.userId, user.id)).orderBy(desc(product.createdAt));
  const ids = rows.map((r) => r.id);

  const since = new Date(now.getTime() - 366 * DAY);
  const day = sql`date_trunc('day', ${pricePoint.checkedAt} at time zone 'Europe/Madrid')`;
  const catalogIds = [...new Set(rows.map((r) => r.catalogId).filter((x): x is string => !!x))];

  // These don't depend on each other, so run them in parallel
  const [points, events, offerRows, settings] = await Promise.all([
    // Only the last reading of each day, the chart is daily anyway and it keeps the response small
    ids.length
      ? db
          .selectDistinctOn([pricePoint.productId, day], {
            productId: pricePoint.productId,
            priceCents: pricePoint.priceCents,
            checkedAt: pricePoint.checkedAt,
          })
          .from(pricePoint)
          .where(and(inArray(pricePoint.productId, ids), gte(pricePoint.checkedAt, since)))
          .orderBy(pricePoint.productId, day, desc(pricePoint.checkedAt))
      : Promise.resolve([]),
    ids.length
      ? db
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
      : Promise.resolve([]),
    // Store offers for sample catalog products (for the store comparison)
    catalogIds.length ? db.select().from(catalogOffer).where(inArray(catalogOffer.productId, catalogIds)) : Promise.resolve([]),
    getSettings(user.id),
  ]);

  // Group price points by product
  const byProduct = new Map<string, PointRow[]>();
  for (const p of points) {
    const list = byProduct.get(p.productId) ?? [];
    list.push(p);
    byProduct.set(p.productId, list);
  }

  const products = rows.map((r) => {
    const p = productFromRows(r, byProduct.get(r.id) ?? [], now);
    if (!r.catalogId) return p;
    const offers = offerRows
      .filter((o) => o.productId === r.catalogId)
      // The followed store uses its current (simulated) price, the rest use the catalog price
      .map((o) => ({
        store: o.store,
        price: o.store === r.store ? p.cur : o.priceCents / 100,
        url: o.url,
        shipping: o.shipping,
        shipCents: o.shippingCents,
      }));
    return { ...p, simulated: true, stores: Math.max(1, offers.length), offers };
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lastChecked = latestCheck(rows);

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
    settings,
    lastCheckMinutes: lastChecked ? Math.round((now.getTime() - lastChecked.getTime()) / 60000) : null,
  };
}
