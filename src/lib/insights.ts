// Small calculations shared by several pages.
import type { Product } from "./demo-data";
import { r2 } from "./format";

export type SortKey = "drop" | "near" | "price" | "name";

/**
 * How far the price is from the target, as a fraction of the current price.
 * Products without a target get a big number so they sort last.
 */
export const distanceToTarget = (p: Product) => (p.target ? (p.cur - p.target) / p.cur : 9);

export function sortProducts(list: Product[], sort: SortKey) {
  const cmp: Record<SortKey, (a: Product, b: Product) => number> = {
    drop: (a, b) => a.ch - b.ch,
    near: (a, b) => distanceToTarget(a) - distanceToTarget(b),
    price: (a, b) => a.cur - b.cur,
    name: (a, b) => a.name.localeCompare(b.name, "es"),
  };
  return [...list].sort(cmp[sort]);
}

/**
 * Progress towards the target (0 to 1), starting from the highest price in the
 * last 90 days. Never below 4% so the bar is always visible.
 */
export function targetProgress(p: Product) {
  if (!p.target) return 0;
  const m90 = Math.max(...p.series.slice(-90));
  if (m90 <= p.target) return 1;
  return Math.max(0.04, Math.min(1, (m90 - p.cur) / (m90 - p.target)));
}

export const leftToTarget = (p: Product) => (p.target ? r2(p.cur - p.target) : 0);

export type AlertBadge = "alcanzado" | "activa" | "pausada" | "none";

// Which alert pill to show for a product, given if its alert is switched on
export function alertBadge(p: Product, on: boolean | undefined): AlertBadge {
  if (p.alert === "alcanzado" && on !== false) return "alcanzado";
  if (p.target && on) return "activa";
  if (p.target) return "pausada";
  return "none";
}
