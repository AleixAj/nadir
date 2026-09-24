// Cálculos derivados que usan varias pantallas. Funciones puras.
import type { Product } from "./demo-data";
import { r2 } from "./format";

export type SortKey = "drop" | "near" | "price" | "name";

/** Cuánto le falta al precio para llegar al objetivo, relativo al precio actual. */
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
 * Progreso hacia el objetivo (0–1), tomando como punto de partida el máximo
 * de los últimos 90 días. Nunca baja de 4 % para que la barra se vea.
 */
export function targetProgress(p: Product) {
  if (!p.target) return 0;
  const m90 = Math.max(...p.series.slice(-90));
  if (m90 <= p.target) return 1;
  return Math.max(0.04, Math.min(1, (m90 - p.cur) / (m90 - p.target)));
}

export const leftToTarget = (p: Product) => (p.target ? r2(p.cur - p.target) : 0);

export type AlertBadge = "alcanzado" | "activa" | "pausada" | "none";

export function alertBadge(p: Product, on: boolean | undefined): AlertBadge {
  if (p.alert === "alcanzado" && on !== false) return "alcanzado";
  if (p.target && on) return "activa";
  if (p.target) return "pausada";
  return "none";
}
