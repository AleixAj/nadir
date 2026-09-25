import { describe, expect, it } from "vitest";
import { buildChart, niceStep } from "../chart";
import { DEMO_PRODUCTS, detectFromUrl, HISTORY_DAYS, makeSeries, rankOffers, searchCatalog } from "../demo-data";
import { eur, eurS, parsePrice, pctS } from "../format";
import { alertBadge, sortProducts, targetProgress } from "../insights";

describe("price formatting", () => {
  it("uses Spanish format with a non-breaking space", () => {
    expect(eur(1249.5)).toBe("1249,50 €");
    expect(eurS(229)).toBe("229 €");
    expect(eurS(89.99)).toBe("89,99 €");
  });
  it("adds a sign to percentage changes", () => {
    expect(pctS(-12)).toBe("−12,0 %");
    expect(pctS(3.84)).toBe("+3,8 %");
    expect(pctS(0.01)).toBe("0,0 %");
  });
  it("accepts comma or dot when parsing a price", () => {
    expect(parsePrice("229,5")).toBe(229.5);
    expect(parsePrice(" 99.99 ")).toBe(99.99);
    expect(parsePrice("abc")).toBeNaN();
  });
});

describe("simulated history", () => {
  const shapes = ["random", "launch", "volatile", "stable"] as const;
  it.each(shapes)("shape %s keeps the min, the price 7 days ago and the current price", (shape) => {
    const p = { cur: 379, prev7: 399, min: 349, minAgo: 58, shape };
    const s = makeSeries(p, 7);
    expect(s).toHaveLength(HISTORY_DAYS);
    expect(Math.min(...s)).toBe(349);
    expect(s[HISTORY_DAYS - 1 - 58]).toBe(349);
    expect(s[HISTORY_DAYS - 8]).toBe(399);
    expect(s.at(-1)).toBe(379);
  });
  it("is deterministic", () => {
    const p = { cur: 100, prev7: 110, min: 80, minAgo: 30 };
    expect(makeSeries(p, 3)).toEqual(makeSeries(p, 3));
  });
  it("every demo product has its all-time low in the series", () => {
    for (const p of DEMO_PRODUCTS) expect(Math.min(...p.series)).toBe(p.min);
  });
});

describe("chart", () => {
  it("picks round axis steps", () => {
    expect(niceStep(7)).toBe(10);
    expect(niceStep(2.2)).toBe(2.5);
    expect(niceStep(38)).toBe(50);
  });
  it("marks the nadir when the period low is the all-time low", () => {
    const p = DEMO_PRODUCTS[0];
    const c = buildChart({ series: p.series, range: "1A", width: 800, compact: false, allTimeMin: p.min, target: 359 });
    expect(c.nadir.isNadir).toBe(true);
    expect(c.nadir.label.startsWith("Nadir")).toBe(true);
    expect(c.data).toHaveLength(365);
    expect(c.targetY).not.toBeNull();
  });
  it("turns a mouse position into a valid index", () => {
    const p = DEMO_PRODUCTS[0];
    const c = buildChart({ series: p.series, range: "7D", width: 600, compact: true, allTimeMin: p.min, target: null });
    expect(c.indexAt(-50)).toBe(0);
    expect(c.indexAt(10_000)).toBe(c.len - 1);
  });
});

describe("store comparison and alerts", () => {
  it("best offer is the cheapest including shipping, stores with errors go last", () => {
    const r = rankOffers([
      { name: "A", price: 100, ship: 5 },
      { name: "B", price: 102, ship: 0 },
      { name: "C", error: true },
    ]);
    expect(r.map((x) => x.name)).toEqual(["B", "A", "C"]);
    expect(r[0].best).toBe(true);
    expect(r[2].best).toBe(false);
  });
  it("sorts by biggest drop", () => {
    const sorted = sortProducts(DEMO_PRODUCTS, "drop");
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].ch).toBeGreaterThanOrEqual(sorted[i - 1].ch);
  });
  it("works out the alert status", () => {
    const p = { ...DEMO_PRODUCTS[0], alert: "activa" as const, target: 359 };
    expect(alertBadge(p, true)).toBe("activa");
    expect(alertBadge(p, false)).toBe("pausada");
    expect(alertBadge({ ...p, target: null }, undefined)).toBe("none");
  });
  it("target progress is between 0 and 1", () => {
    for (const p of DEMO_PRODUCTS.filter((x) => x.target)) {
      const v = targetProgress(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("add product", () => {
  it("recognizes URLs from supported stores", () => {
    expect(detectFromUrl("https://www.pccomponentes.com/samsung-odyssey-g5-27")?.slug).toBe("odyssey-g5");
    expect(detectFromUrl("https://tiendaxyz.com/oferta/8812")).toBeNull();
  });
  it("searches by name from 2 letters", () => {
    expect(searchCatalog("s")).toEqual([]);
    expect(searchCatalog("sony").map((x) => x.slug)).toContain("sony-wf-1000xm5");
  });
});

describe("zero or missing prices", () => {
  it("never shows NaN in percentages", () => {
    expect(pctS(NaN)).not.toContain("NaN");
    expect(pctS(Infinity)).not.toContain("Infinity");
  });
  it("draws a chart even when the price is 0", () => {
    const c = buildChart({ series: [0], range: "1M", width: 600, compact: true, allTimeMin: 0, target: null });
    expect(c.line).not.toContain("NaN");
    expect(Number.isFinite(c.stats.change)).toBe(true);
  });
});
