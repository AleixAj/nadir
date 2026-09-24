// Convierte los datos guardados (precios en céntimos con fecha) al formato
// Product que usa la interfaz, el mismo que el de la demo. Funciones puras.
import type { AlertStatus, ListName, Product, ProductIcon } from "./demo-data";
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
  list: string;
  targetCents: number | null;
  alertOn: boolean;
  lastCheckedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

const DAY = 24 * 60 * 60 * 1000;
/** Día (en milisegundos a las 00:00 UTC) de una fecha */
const dayOf = (d: Date) => Math.floor(d.getTime() / DAY);

/**
 * Un precio por día, desde el primer precio registrado hasta `today`.
 * Si un día hay varias lecturas se queda la última; los días sin lectura
 * repiten el precio anterior (el precio sigue igual hasta que cambia).
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
  // Un año como mucho, igual que la demo
  return out.slice(-365);
}

const iconFor = (list: string): ProductIcon => (list === "Hogar" ? "kitchen" : "desktop");

export function productFromRows(row: ProductRow, points: PointRow[], now: Date): Product {
  const series = dailySeries(points, now);
  const len = series.length;
  const cur = series[len - 1] ?? 0;
  const prev7 = series[Math.max(0, len - 8)] ?? cur;
  const min = len ? Math.min(...series) : cur;
  const minAgo = len ? len - 1 - series.lastIndexOf(min) : 0;
  const target = row.targetCents != null ? row.targetCents / 100 : null;
  const alert: AlertStatus = target == null ? "none" : cur <= target ? "alcanzado" : row.alertOn ? "activa" : "pausada";

  return {
    id: row.id,
    name: row.name,
    list: (row.list === "Hogar" ? "Hogar" : "Tecnología") as ListName,
    icon: iconFor(row.list),
    image: row.image ?? undefined,
    cur,
    prev7,
    min,
    minAgo,
    store: row.store,
    target,
    alert,
    stores: 1,
    since: fd(row.createdAt),
    checked: row.lastCheckedAt ? Math.max(0, Math.round((now.getTime() - row.lastCheckedAt.getTime()) / 60000)) : 0,
    series: len ? series : [cur],
    ch: prev7 ? change7d(cur, prev7) : 0,
    url: row.url,
    lastError: row.lastError,
    endDate: now.toISOString(),
  };
}

/** ¿Hay que generar un aviso? Solo al cruzar el objetivo, no en cada revisión. */
export function crossedTarget(prevCents: number | null, priceCents: number, targetCents: number | null, alertOn: boolean) {
  if (!alertOn || targetCents == null) return false;
  return priceCents <= targetCents && (prevCents == null || prevCents > targetCents);
}
