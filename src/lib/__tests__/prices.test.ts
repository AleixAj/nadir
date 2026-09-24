import { describe, expect, it } from "vitest";
import { buildChart, niceStep } from "../chart";
import { DEMO_PRODUCTS, detectFromUrl, HISTORY_DAYS, makeSeries, rankOffers, searchCatalog } from "../demo-data";
import { eur, eurS, parsePrice, pctS } from "../format";
import { alertBadge, sortProducts, targetProgress } from "../insights";

describe("formato de precios", () => {
  it("usa formato español con espacio no separable", () => {
    expect(eur(1249.5)).toBe("1249,50 €");
    expect(eurS(229)).toBe("229 €");
    expect(eurS(89.99)).toBe("89,99 €");
  });
  it("pone signo a las variaciones", () => {
    expect(pctS(-12)).toBe("−12,0 %");
    expect(pctS(3.84)).toBe("+3,8 %");
    expect(pctS(0.01)).toBe("0,0 %");
  });
  it("acepta coma o punto al leer un precio", () => {
    expect(parsePrice("229,5")).toBe(229.5);
    expect(parsePrice(" 99.99 ")).toBe(99.99);
    expect(parsePrice("abc")).toBeNaN();
  });
});

describe("histórico simulado", () => {
  const shapes = ["random", "launch", "volatile", "stable"] as const;
  it.each(shapes)("forma %s: respeta mínimo, precio de hace 7 días y precio actual", (shape) => {
    const p = { cur: 379, prev7: 399, min: 349, minAgo: 58, shape };
    const s = makeSeries(p, 7);
    expect(s).toHaveLength(HISTORY_DAYS);
    expect(Math.min(...s)).toBe(349);
    expect(s[HISTORY_DAYS - 1 - 58]).toBe(349);
    expect(s[HISTORY_DAYS - 8]).toBe(399);
    expect(s.at(-1)).toBe(379);
  });
  it("es determinista", () => {
    const p = { cur: 100, prev7: 110, min: 80, minAgo: 30 };
    expect(makeSeries(p, 3)).toEqual(makeSeries(p, 3));
  });
  it("cada producto de la demo tiene su mínimo histórico en la serie", () => {
    for (const p of DEMO_PRODUCTS) expect(Math.min(...p.series)).toBe(p.min);
  });
});

describe("gráfica", () => {
  it("elige pasos de eje redondos", () => {
    expect(niceStep(7)).toBe(10);
    expect(niceStep(2.2)).toBe(2.5);
    expect(niceStep(38)).toBe(50);
  });
  it("marca el nadir cuando el mínimo del periodo es el histórico", () => {
    const p = DEMO_PRODUCTS[0];
    const c = buildChart({ series: p.series, range: "1A", width: 800, compact: false, allTimeMin: p.min, target: 359 });
    expect(c.nadir.isNadir).toBe(true);
    expect(c.nadir.label.startsWith("Nadir")).toBe(true);
    expect(c.data).toHaveLength(365);
    expect(c.targetY).not.toBeNull();
  });
  it("convierte una posición del ratón en un índice válido", () => {
    const p = DEMO_PRODUCTS[0];
    const c = buildChart({ series: p.series, range: "7D", width: 600, compact: true, allTimeMin: p.min, target: null });
    expect(c.indexAt(-50)).toBe(0);
    expect(c.indexAt(10_000)).toBe(c.len - 1);
  });
});

describe("comparativa y alertas", () => {
  it("la mejor oferta es la de menor precio con envío, y las tiendas con error van al final", () => {
    const r = rankOffers([
      { name: "A", price: 100, ship: 5 },
      { name: "B", price: 102, ship: 0 },
      { name: "C", error: true },
    ]);
    expect(r.map((x) => x.name)).toEqual(["B", "A", "C"]);
    expect(r[0].best).toBe(true);
    expect(r[2].best).toBe(false);
  });
  it("ordena por mayor bajada", () => {
    const sorted = sortProducts(DEMO_PRODUCTS, "drop");
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].ch).toBeGreaterThanOrEqual(sorted[i - 1].ch);
  });
  it("calcula el estado de la alerta", () => {
    const p = { ...DEMO_PRODUCTS[0], alert: "activa" as const, target: 359 };
    expect(alertBadge(p, true)).toBe("activa");
    expect(alertBadge(p, false)).toBe("pausada");
    expect(alertBadge({ ...p, target: null }, undefined)).toBe("none");
  });
  it("el progreso hacia el objetivo está entre 0 y 1", () => {
    for (const p of DEMO_PRODUCTS.filter((x) => x.target)) {
      const v = targetProgress(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("añadir producto", () => {
  it("reconoce URLs de tiendas compatibles", () => {
    expect(detectFromUrl("https://www.pccomponentes.com/samsung-odyssey-g5-27")?.slug).toBe("odyssey-g5");
    expect(detectFromUrl("https://tiendaxyz.com/oferta/8812")).toBeNull();
  });
  it("busca por nombre a partir de 2 letras", () => {
    expect(searchCatalog("s")).toEqual([]);
    expect(searchCatalog("sony").map((x) => x.slug)).toContain("sony-wf-1000xm5");
  });
});
