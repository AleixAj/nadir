// Turns saved rows (prices in cents with a date) into the Product shape
// the UI uses, the same one as the demo. Pure functions, easy to test.
import type { AlertStatus, Product } from "./demo-data";
import { change7d } from "./demo-data";
import { fd } from "./format";

export interface PointRow {
  priceCents: number;
  checkedAt: Date;
}

export interface ProductRow {
  id: string;
  url: string;
  store: string;
  name: string;
  image: string | null;
  listId: string | null;
  targetCents: number | null;
  alertOn: boolean;
  lastCheckedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

const DAY = 24 * 60 * 60 * 1000;
// Days are counted in Spain's time zone (00:30 on the 25th is already the 25th, not the 24th)
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
// Day number (days since 1970) of a date, using the Madrid calendar
const dayOf = (d: Date) => Math.floor(Date.parse(dayFmt.format(d) + "T00:00:00Z") / DAY);

/**
 * One price per day, from the first saved price until `today`.
 * If a day has several readings the last one wins. Days with no reading
 * repeat the previous price (it stays the same until it changes).
 */
export function dailySeries(points: PointRow[], today: Date): number[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.checkedAt.getTime() - b.checkedAt.getTime());
  const first = dayOf(sorted[0].checkedAt);
  const last = Math.max(dayOf(today), dayOf(sorted.at(-1)!.checkedAt));
  const byDay = new Map<number, number>();
  for (const p of sorted) byDay.set(dayOf(p.checkedAt), p.priceCents);

  const out: number[] = [];
  let cur = sorted[0].priceCents;
  for (let d = first; d <= last; d++) {
    cur = byDay.get(d) ?? cur;
    out.push(cur / 100);
  }
  // One year max, same as the demo
  return out.slice(-365);
}

function alertStatus(cur: number, target: number | null, alertOn: boolean): AlertStatus {
  if (target == null) return "none";
  if (cur <= target) return "alcanzado";
  return alertOn ? "activa" : "pausada";
}

function minutesSince(date: Date | null, now: Date): number {
  if (!date) return 0;
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
}

export function productFromRows(row: ProductRow, points: PointRow[], now: Date): Product {
  const series = dailySeries(points, now);
  const len = series.length;
  const cur = series[len - 1] ?? 0;
  // Price 7 days ago (or the oldest one we have)
  const prev7 = series[Math.max(0, len - 8)] ?? cur;
  const min = len ? Math.min(...series) : cur;
  // How many days ago the lowest price was (the most recent time it happened)
  const minAgo = len ? len - 1 - series.lastIndexOf(min) : 0;
  const target = row.targetCents != null ? row.targetCents / 100 : null;

  return {
    id: row.id,
    name: row.name,
    list: row.listId,
    // Real products have a photo; the icon is only a fallback
    icon: "desktop",
    image: row.image ?? undefined,
    cur,
    prev7,
    min,
    minAgo,
    store: row.store,
    target,
    alert: alertStatus(cur, target, row.alertOn),
    stores: 1,
    since: fd(row.createdAt),
    checked: minutesSince(row.lastCheckedAt, now),
    series: len ? series : [cur],
    ch: prev7 ? change7d(cur, prev7) : 0,
    url: row.url,
    lastError: row.lastError,
    endDate: now.toISOString(),
  };
}

// Should we create an alert? Only when the price crosses the target, not on every check
export function crossedTarget(prevCents: number | null, priceCents: number, targetCents: number | null, alertOn: boolean) {
  if (!alertOn || targetCents == null) return false;
  return priceCents <= targetCents && (prevCents == null || prevCents > targetCents);
}
