import "server-only";
import { makeSeries } from "@/lib/demo-data";
import { hash, seeded, simulateNextPrice } from "@/lib/catalog";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Histórico simulado de 90 días para un producto del catálogo de prueba,
 * que termina en su precio real de hoy. Usa el mismo generador que la demo.
 */
export function simulatedHistory(currentCents: number, seed: string, now: Date, days = 90) {
  const r = seeded(seed);
  const cur = currentCents / 100;
  const series = makeSeries(
    {
      cur,
      prev7: Math.round(cur * (1 + (r - 0.35) * 0.08) * 100) / 100,
      min: Math.round(cur * (0.86 + r * 0.08) * 100) / 100,
      minAgo: 10 + Math.floor(r * 70),
      shape: r < 0.35 ? "volatile" : r < 0.55 ? "stable" : "random",
    },
    (hash(seed) % 997) + 1,
    days,
  );
  return series.map((v, i) => ({
    priceCents: Math.round(v * 100),
    checkedAt: new Date(now.getTime() - (days - 1 - i) * DAY),
  }));
}

/** Siguiente precio simulado en una revisión (cambia como mucho una vez por hora). */
export function nextSimulatedPrice(prevCents: number, baseCents: number, productId: string, now: Date) {
  const hourKey = now.toISOString().slice(0, 13);
  return simulateNextPrice(prevCents, baseCents, productId + hourKey);
}
