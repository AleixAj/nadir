import "server-only";
import { makeSeries } from "@/lib/demo-data";
import { hash, seeded, simulateNextPrice } from "@/lib/catalog";

const DAY = 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Picks the chart shape from the product's random seed (0 to 1)
function pickShape(r: number) {
  if (r < 0.35) return "volatile";
  if (r < 0.55) return "stable";
  return "random";
}

// 90 days of fake history for a sample catalog product, ending at today's
// real price. Uses the same generator as the demo.
export function simulatedHistory(currentCents: number, seed: string, now: Date, days = 90) {
  const r = seeded(seed);
  const cur = currentCents / 100;
  const series = makeSeries(
    {
      cur,
      prev7: round2(cur * (1 + (r - 0.35) * 0.08)),
      min: round2(cur * (0.86 + r * 0.08)),
      minAgo: 10 + Math.floor(r * 70),
      shape: pickShape(r),
    },
    (hash(seed) % 997) + 1,
    days,
  );
  // One point per day, the last one is today
  return series.map((v, i) => ({
    priceCents: Math.round(v * 100),
    checkedAt: new Date(now.getTime() - (days - 1 - i) * DAY),
  }));
}

// Next simulated price for a check. It changes at most once per hour
export function nextSimulatedPrice(prevCents: number, baseCents: number, productId: string, now: Date) {
  // "2026-09-24T10" style key, same seed for the whole hour
  const hourKey = now.toISOString().slice(0, 13);
  return simulateNextPrice(prevCents, baseCents, productId + hourKey);
}
