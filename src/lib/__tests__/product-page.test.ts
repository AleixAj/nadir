import { describe, expect, it } from "vitest";
import { dailySeries, productFromRows, crossedTarget } from "../history";
import { checkPublicUrl, parsePriceToCents, parseProductPage, storeName } from "../product-page";

describe("precios escritos de cualquier forma", () => {
  it.each([
    ["1.299,00 €", 129900],
    ["1,299.00", 129900],
    ["89,99", 8999],
    ["89.99", 8999],
    ["249", 24900],
    ["1.299", 129900],
    [379, 37900],
    ["€ 45,5", 4550],
  ])("%s → %i céntimos", (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });
  it("rechaza lo que no es un precio", () => {
    expect(parsePriceToCents("gratis")).toBeNull();
    expect(parsePriceToCents(0)).toBeNull();
    expect(parsePriceToCents(null)).toBeNull();
  });
});

describe("lectura de la página de un producto", () => {
  const url = "https://www.tienda.es/p/auriculares";

  it("usa los datos estructurados (JSON-LD) si existen", () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
        {"@type":"BreadcrumbList"},
        {"@type":"Product","name":"Sony WH-1000XM6 &amp; estuche","image":["/img/sony.jpg"],
         "offers":{"@type":"Offer","price":"379.00","priceCurrency":"EUR"}}]}</script>
      <meta property="og:title" content="Otro título">
    </head></html>`;
    expect(parseProductPage(html, url)).toEqual({
      name: "Sony WH-1000XM6 & estuche",
      image: "https://www.tienda.es/img/sony.jpg",
      priceCents: 37900,
      currency: "EUR",
    });
  });

  it("elige la oferta más barata cuando hay varias", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Teclado",
      "offers":[{"price":119},{"price":"109,90"},{"lowPrice":"115"}]}</script>`;
    expect(parseProductPage(html, url)?.priceCents).toBe(10990);
  });

  it("si no hay JSON-LD, usa las etiquetas Open Graph", () => {
    const html = `<head>
      <meta content="Logitech MX Keys S" property="og:title" />
      <meta property="og:image" content="https://cdn.tienda.es/mx.jpg">
      <meta property="product:price:amount" content="99,99">
      <meta property="product:price:currency" content="eur">
    </head>`;
    expect(parseProductPage(html, url)).toEqual({
      name: "Logitech MX Keys S",
      image: "https://cdn.tienda.es/mx.jpg",
      priceCents: 9999,
      currency: "EUR",
    });
  });

  it("devuelve null si no encuentra el precio", () => {
    expect(parseProductPage("<title>Portada</title>", url)).toBeNull();
  });

  it("ignora bloques JSON-LD mal formados", () => {
    const html = `<script type="application/ld+json">{roto</script>
      <script type="application/ld+json">{"@type":["Product","Thing"],"name":"Tablet","offers":{"price":329}}</script>`;
    expect(parseProductPage(html, url)?.name).toBe("Tablet");
  });
});

describe("seguridad de la URL", () => {
  it.each(["https://www.pccomponentes.com/producto", "http://tienda.es/p/1"])("acepta %s", (u) => {
    expect(checkPublicUrl(u).ok).toBe(true);
  });
  it.each([
    "ftp://tienda.es/p",
    "http://localhost:3000/api",
    "http://127.0.0.1/",
    "http://192.168.1.10/admin",
    "http://10.0.0.1/",
    "http://[::1]/",
    "https://tienda.es:8443/p",
    "https://usuario:clave@tienda.es/p",
    "http://intranet/",
    "no es una url",
  ])("bloquea %s", (u) => {
    expect(checkPublicUrl(u).ok).toBe(false);
  });
});

describe("nombre de la tienda", () => {
  it("reconoce las tiendas conocidas y deduce el resto", () => {
    expect(storeName("https://www.elcorteingles.es/electronica/x")).toBe("El Corte Inglés");
    expect(storeName("https://tienda.amazon.es/dp/1")).toBe("Amazon");
    expect(storeName("https://www.mitienda.com/p")).toBe("Mitienda");
  });
});

describe("histórico real", () => {
  const d = (s: string) => new Date(s + "T10:00:00Z");

  it("rellena los días sin lectura con el precio anterior", () => {
    const s = dailySeries(
      [
        { priceCents: 10000, checkedAt: d("2026-09-01") },
        { priceCents: 9000, checkedAt: d("2026-09-03") },
      ],
      d("2026-09-05"),
    );
    expect(s).toEqual([100, 100, 90, 90, 90]);
  });

  it("si un día hay varias lecturas, se queda la última", () => {
    const s = dailySeries(
      [
        { priceCents: 10000, checkedAt: new Date("2026-09-01T08:00:00Z") },
        { priceCents: 9500, checkedAt: new Date("2026-09-01T20:00:00Z") },
      ],
      d("2026-09-01"),
    );
    expect(s).toEqual([95]);
  });

  it("convierte las filas en un producto con mínimo, variación y estado de alerta", () => {
    const now = d("2026-09-10");
    const points = [
      { priceCents: 40000, checkedAt: d("2026-09-01") },
      { priceCents: 35000, checkedAt: d("2026-09-05") },
      { priceCents: 37900, checkedAt: d("2026-09-09") },
    ];
    const p = productFromRows(
      {
        id: "x",
        url: "https://tienda.es/p",
        store: "Tienda",
        name: "Auriculares",
        image: null,
        list: "Tecnología",
        targetCents: 36000,
        alertOn: true,
        lastCheckedAt: d("2026-09-09"),
        lastError: null,
        createdAt: d("2026-09-01"),
      },
      points,
      now,
    );
    expect(p.cur).toBe(379);
    expect(p.min).toBe(350);
    expect(p.prev7).toBe(400); // hace 7 días (3 sep) costaba 400 €
    expect(p.alert).toBe("activa");
    expect(p.series).toHaveLength(10);
  });

  it("solo avisa al cruzar el objetivo, no en cada revisión", () => {
    expect(crossedTarget(400, 350, 360, true)).toBe(true);
    expect(crossedTarget(350, 340, 360, true)).toBe(false);
    expect(crossedTarget(null, 350, 360, true)).toBe(true);
    expect(crossedTarget(400, 350, 360, false)).toBe(false);
    expect(crossedTarget(400, 350, null, true)).toBe(false);
  });
});
