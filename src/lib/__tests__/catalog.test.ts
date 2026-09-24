import { describe, expect, it } from "vitest";
import { catalogId, groupKey, isAccessory, normalizeStore, normalizeText, parseEuros, parseShipping, sameProduct, simulateNextPrice, trustedStore } from "../catalog";

describe("catalog stores", () => {
  it.each([
    ["Amazon.es", "Amazon"],
    ["PcComponentes.com", "PcComponentes"],
    ["MediaMarkt", "MediaMarkt"],
    ["El Corte Inglés", "El Corte Inglés"],
    ["ASUS Store ES", "ASUS Store"],
    ["Oral-B ES", "Oral-B"],
  ])("maps %s to %s", (source, name) => {
    expect(normalizeStore(source)).toBe(name);
  });
  it("leaves out unknown stores, second-hand sites and carriers", () => {
    expect(normalizeStore("eBay - vendedor123")).toBeNull();
    expect(normalizeStore("Tienda Pepe.es")).toBeNull();
    expect(normalizeStore("Movistar")).toBeNull();
    expect(normalizeStore("Cash Converters España")).toBeNull();
    expect(normalizeStore(undefined)).toBeNull();
  });
  it("detects accessories", () => {
    expect(isAccessory("Funda iPhone 17 Pro Max Clear")).toBe(true);
    expect(isAccessory("Cristal templado Galaxy S25")).toBe(true);
    expect(isAccessory("Apple iPhone 17 Pro 256 GB")).toBe(false);
  });
});

describe("trusted stores in the comparison", () => {
  it("accepts known stores even without a rating", () => {
    expect(trustedStore("Amazon.es - Seller")).toBe("Amazon");
    expect(trustedStore("Tien21")).toBe("Tien21");
  });
  it("accepts unknown stores only with a good rating and many reviews", () => {
    expect(trustedStore("Tienda Buena", 4.6, 1200)).toBe("Tienda Buena");
    expect(trustedStore("Tienda Nueva", 4.8, 18)).toBeNull();
    expect(trustedStore("Tienda Regular", 3.9, 5000)).toBeNull();
    expect(trustedStore("cartucho.es", 4.7, 900)).toBe("Cartucho");
    expect(trustedStore("» Info-Computer", 4.5, 3000)).toBe("Info-Computer");
  });
  it("never accepts marketplaces, second-hand sites or carriers", () => {
    expect(trustedStore("eBay - bq_shop05", 5, 99999)).toBeNull();
    expect(trustedStore("Productpine", 4.9, 5000)).toBeNull();
    expect(trustedStore("Movistar", 4.5, 5000)).toBeNull();
    expect(trustedStore("Back Market", 4.6, 90000)).toBeNull();
    expect(trustedStore("Miravia", 4.5, 20000)).toBeNull();
  });
  it("parses shipping costs", () => {
    expect(parseShipping("Gratis")).toBe(0);
    expect(parseShipping("+ 3,90 €")).toBe(390);
    expect(parseShipping(undefined)).toBeNull();
  });
});

describe("grouping the same product", () => {
  it("ignores case, accents, symbols and filler words", () => {
    expect(groupKey("Apple iPhone 17 (256 GB) - Negro")).toBe(groupKey("APPLE iPhone 17 256 GB negro · Nuevo"));
  });
  it("builds a stable, readable id", () => {
    const id = catalogId(groupKey("Sony WH-1000XM6 Auriculares"));
    expect(id).toBe(catalogId(groupKey("Sony WH-1000XM6 Auriculares")));
    expect(id).toMatch(/^sony-wh-1000xm6-auriculares-[a-z0-9]{1,6}$/);
  });
  it("normalizes text for search", () => {
    expect(normalizeText("  Cafetera  De'Longhi  Magnífica ")).toBe("cafetera de'longhi magnifica");
  });
});

describe("simulated price", () => {
  it("is deterministic for the same seed", () => {
    expect(simulateNextPrice(30000, 30000, "x-1")).toBe(simulateNextPrice(30000, 30000, "x-1"));
  });
  it("never drifts too far from the real price", () => {
    let p = 30000;
    for (let i = 0; i < 2000; i++) {
      p = simulateNextPrice(p, 30000, "prod-" + i);
      expect(p).toBeGreaterThanOrEqual(30000 * 0.72 - 100);
      expect(p).toBeLessThanOrEqual(30000 * 1.12 + 100);
    }
  });
  it("leaves the price unchanged in most checks", () => {
    let same = 0;
    for (let i = 0; i < 1000; i++) if (simulateNextPrice(30000, 30000, "s" + i) === 30000) same++;
    expect(same).toBeGreaterThan(500);
  });
});

describe("same product in another store", () => {
  it("matches the same model even when the title differs", () => {
    expect(sameProduct("OnePlus 13 5G", "OnePlus 13 5G Smartphone 6.82'' Dual SIM Octa Core")).toBe(true);
    expect(sameProduct("Altavoz JBL Flip 7", "JBL Flip 7 Negro - Altavoz Bluetooth")).toBe(true);
    expect(sameProduct("OnePlus 13R 5G 12/256GB", "OnePlus 13R 5G 12GB/256GB Negro")).toBe(true);
    expect(sameProduct("Samsung Galaxy S25 256 GB, RAM 12 GB", "Smartphone Samsung Galaxy S25 12GB 256GB 6.2\" 5G Gris")).toBe(true);
    expect(sameProduct("Samsung Galaxy S25 128GB Teléfono Móvil con IA, Galaxy AI, 12GB RAM", "Samsung Galaxy S25 5G 12GB/128GB Negro")).toBe(true);
  });
  it("does not mix up variants or other models", () => {
    expect(sameProduct("OnePlus 13 5G", "OnePlus 13R 5G 12/256GB")).toBe(false);
    expect(sameProduct("OnePlus 13 5G", "OnePlus 13T 5G PKX110 Dual Sim 256GB Black")).toBe(false);
    expect(sameProduct("Altavoz JBL Flip 7", "JBL Flip 6 Altavoz")).toBe(false);
    expect(sameProduct("iPhone 17 256GB", "iPhone 17 Pro 256GB")).toBe(false);
    expect(sameProduct("iPhone 17 256GB", "iPhone 17 512GB")).toBe(false);
    expect(sameProduct("Samsung Galaxy A56 5G 256GB", "Samsung Galaxy A56 5G")).toBe(false);
    expect(sameProduct("Samsung Galaxy S25 256 GB, RAM 12 GB", "Samsung Galaxy S25+ 256GB")).toBe(false);
    expect(sameProduct("Samsung Galaxy S25 FE", "Samsung Galaxy S25 FE 128GB reacondicionado")).toBe(false);
  });
  it("parses euro prices", () => {
    expect(parseEuros("1.540,80 €")).toBe(154080);
    expect(parseEuros("594,95 €")).toBe(59495);
    expect(parseEuros("")).toBeNull();
  });
});
