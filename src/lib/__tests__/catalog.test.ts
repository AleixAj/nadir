import { describe, expect, it } from "vitest";
import { catalogId, groupKey, isAccessory, normalizeStore, normalizeText, simulateNextPrice } from "../catalog";

describe("tiendas del catálogo", () => {
  it.each([
    ["Amazon.es", "Amazon"],
    ["PcComponentes.com", "PcComponentes"],
    ["MediaMarkt", "MediaMarkt"],
    ["El Corte Inglés", "El Corte Inglés"],
    ["Back Market", "Back Market"],
    ["ASUS Store ES", "ASUS Store"],
    ["Oral-B ES", "Oral-B"],
  ])("%s → %s", (source, name) => {
    expect(normalizeStore(source)).toBe(name);
  });
  it("deja fuera tiendas desconocidas, segunda mano y operadoras", () => {
    expect(normalizeStore("eBay - vendedor123")).toBeNull();
    expect(normalizeStore("Tienda Pepe.es")).toBeNull();
    expect(normalizeStore("Movistar")).toBeNull();
    expect(normalizeStore("Cash Converters España")).toBeNull();
    expect(normalizeStore(undefined)).toBeNull();
  });
  it("detecta accesorios", () => {
    expect(isAccessory("Funda iPhone 17 Pro Max Clear")).toBe(true);
    expect(isAccessory("Cristal templado Galaxy S25")).toBe(true);
    expect(isAccessory("Apple iPhone 17 Pro 256 GB")).toBe(false);
  });
});

describe("agrupar el mismo producto", () => {
  it("ignora mayúsculas, tildes, signos y palabras de relleno", () => {
    expect(groupKey("Apple iPhone 17 (256 GB) - Negro")).toBe(groupKey("APPLE iPhone 17 256 GB negro · Nuevo"));
  });
  it("el id es estable y legible", () => {
    const id = catalogId(groupKey("Sony WH-1000XM6 Auriculares"));
    expect(id).toBe(catalogId(groupKey("Sony WH-1000XM6 Auriculares")));
    expect(id).toMatch(/^sony-wh-1000xm6-auriculares-[a-z0-9]{1,6}$/);
  });
  it("normaliza texto para buscar", () => {
    expect(normalizeText("  Cafetera  De'Longhi  Magnífica ")).toBe("cafetera de'longhi magnifica");
  });
});

describe("precio simulado", () => {
  it("es determinista para la misma semilla", () => {
    expect(simulateNextPrice(30000, 30000, "x-1")).toBe(simulateNextPrice(30000, 30000, "x-1"));
  });
  it("nunca se aleja demasiado del precio real", () => {
    let p = 30000;
    for (let i = 0; i < 2000; i++) {
      p = simulateNextPrice(p, 30000, "prod-" + i);
      expect(p).toBeGreaterThanOrEqual(30000 * 0.72 - 100);
      expect(p).toBeLessThanOrEqual(30000 * 1.12 + 100);
    }
  });
  it("la mayoría de las revisiones no cambian el precio", () => {
    let same = 0;
    for (let i = 0; i < 1000; i++) if (simulateNextPrice(30000, 30000, "s" + i) === 30000) same++;
    expect(same).toBeGreaterThan(500);
  });
});
