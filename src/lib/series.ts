// Builds the fake daily price history used by the demo and by the sample catalog.
// Same seed gives the same series, so the demo looks the same on every visit.
import type { Product } from "./demo-data";

// Shape of the simulated history:
// - launch: starts expensive and drops over time (phones, new releases)
// - volatile: price changes very often (typical of marketplaces)
// - stable: barely moves
// - random: changes every now and then
export type Shape = "random" | "launch" | "volatile" | "stable";

export const HISTORY_DAYS = 365;

// How many days ago (from 24 sep 2026) the big sales happened
const BLACK_FRIDAY = 300; // 28 nov 2025
const PRIME_DAY = 75; // 11 jul 2026

// How often the price changes each day, per shape (launch has its own logic)
const CHANGE_CHANCE = { volatile: 0.24, stable: 0.02, random: 0.09 };

/**
 * Builds a believable daily price history. Same seed gives the same series.
 * The all-time low lands on the right day and the last 7 days go from `prev7` to `cur`.
 */
export function makeSeries(
  p: Pick<Product, "cur" | "prev7" | "min" | "minAgo" | "shape">,
  seed: number,
  n = HISTORY_DAYS,
): number[] {
  // Small seeded random generator (0 to 1), so the demo looks the same every time
  let s = seed * 7919 + 13;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const shape = p.shape ?? "random";
  const hi = Math.max(p.cur, p.prev7) * (shape === "launch" ? 1.22 : 1.12);
  const lo = p.min;
  const floor = lo + (hi - lo) * 0.3;
  // Store-like prices: whole euros or ending in ,99
  const q = (v: number) => Math.round(v) - (rnd() < 0.5 ? 0.01 : 0);

  const out: number[] = [];
  if (shape === "launch") {
    // Steps down every ~5 weeks, from launch price to the current one
    const end = Math.max(p.cur, p.prev7);
    let v = q(hi);
    for (let i = 0; i < n; i++) {
      if (i % 35 === 0 && i > 0) {
        const trend = hi - (hi - end) * Math.pow(i / n, 0.8);
        const noise = (rnd() - 0.5) * (hi - end) * 0.08;
        v = q(trend + noise);
      }
      out.push(v);
    }
  } else {
    const chance = CHANGE_CHANCE[shape];
    // Stable products stay in the upper part of the range
    const top = shape === "stable" ? floor + (hi - floor) * 0.55 : floor;
    let v = q(top + rnd() * (hi - top));
    for (let i = 0; i < n; i++) {
      if (rnd() < chance) v = q(top + rnd() * (hi - top));
      out.push(v);
    }
  }

  // Black Friday and Prime Day discounts (not for stable products)
  if (shape !== "stable") {
    const sales = [
      { daysAgo: BLACK_FRIDAY, length: 5, cut: 0.1 },
      { daysAgo: PRIME_DAY, length: 2, cut: 0.08 },
    ];
    for (const sale of sales) {
      const start = n - 1 - sale.daysAgo;
      for (let k = start; k < start + sale.length; k++) {
        if (k >= 0 && k < n - 8) out[k] = Math.max(q(lo + 1), q(out[k] * (1 - sale.cut)));
      }
    }
  }

  // Put the all-time low on its day, with lower prices around it
  const lowIndex = n - 1 - p.minAgo;
  const nearLow = q(lo + (hi - lo) * 0.12);
  for (let k = lowIndex - 3; k <= lowIndex + 3; k++) {
    if (k >= 0 && k < n - 8 && out[k] > nearLow) out[k] = nearLow;
  }
  out[lowIndex] = lo;
  if (lowIndex + 1 < n - 8) out[lowIndex + 1] = lo;

  // Nothing can go below the all-time low
  for (let k = 0; k < n; k++) {
    if (out[k] < lo) out[k] = lo;
  }

  // Last week: from prev7 to cur
  out[n - 8] = p.prev7;
  out[n - 7] = p.prev7;
  for (let k = n - 6; k < n - 2; k++) {
    if (p.cur === p.prev7) {
      // Same price as a week ago: add small random bumps
      out[k] = rnd() < 0.5 ? p.cur : q(p.cur * (1 + rnd() * 0.04));
    } else {
      const t = (k - (n - 8)) / 7;
      out[k] = Math.max(Math.min(p.cur, p.prev7), q(p.prev7 + (p.cur - p.prev7) * t));
    }
  }
  out[n - 2] = p.cur;
  out[n - 1] = p.cur;
  return out;
}
