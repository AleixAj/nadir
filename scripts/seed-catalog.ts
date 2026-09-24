// Carga el catálogo de prueba: productos reales de Google Shopping España (vía SerpApi),
// con sus fotos y precios en varias tiendas, y los guarda en la base de datos.
//
// Uso:  npm run catalog:seed
//
// - Cada búsqueda se guarda en scripts/.cache: volver a ejecutarlo no gasta búsquedas.
// - Las fotos se descargan una vez a public/catalog/ (WebP, 240 px, fondo blanco).
// - Necesita SERPAPI_KEY y DATABASE_URL en .env.local.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import sharp from "sharp";
import { catalogId, groupKey, isAccessory, normalizeStore, normalizeText } from "../src/lib/catalog.ts";

/* ─── Configuración ─────────────────────────────────────────── */

type List = "Tecnología" | "Hogar";
const QUERIES: [query: string, category: string, list: List][] = [
  ["iPhone 17", "Móviles", "Tecnología"],
  ["iPhone 16", "Móviles", "Tecnología"],
  ["Samsung Galaxy S25", "Móviles", "Tecnología"],
  ["Samsung Galaxy A56", "Móviles", "Tecnología"],
  ["Google Pixel 10", "Móviles", "Tecnología"],
  ["Xiaomi Redmi Note 14", "Móviles", "Tecnología"],
  ["OnePlus 13", "Móviles", "Tecnología"],
  ["auriculares Sony WH-1000XM6", "Auriculares", "Tecnología"],
  ["AirPods Pro 3", "Auriculares", "Tecnología"],
  ["auriculares inalámbricos cancelación de ruido", "Auriculares", "Tecnología"],
  ["Samsung Galaxy Buds", "Auriculares", "Tecnología"],
  ["MacBook Air M4", "Portátiles", "Tecnología"],
  ["portátil gaming RTX", "Portátiles", "Tecnología"],
  ["portátil Lenovo", "Portátiles", "Tecnología"],
  ["iPad Air", "Tablets", "Tecnología"],
  ["tablet Samsung Galaxy Tab", "Tablets", "Tecnología"],
  ["Kindle Paperwhite", "Tablets", "Tecnología"],
  ["monitor gaming 27 pulgadas", "Monitores", "Tecnología"],
  ["monitor 4K", "Monitores", "Tecnología"],
  ["teclado mecánico", "Periféricos", "Tecnología"],
  ["ratón Logitech MX Master", "Periféricos", "Tecnología"],
  ["Nintendo Switch 2", "Consolas", "Tecnología"],
  ["PlayStation 5", "Consolas", "Tecnología"],
  ["Xbox Series X", "Consolas", "Tecnología"],
  ["Apple Watch", "Relojes", "Tecnología"],
  ["Garmin Forerunner", "Relojes", "Tecnología"],
  ["altavoz JBL", "Audio", "Tecnología"],
  ["barra de sonido", "Audio", "Tecnología"],
  ["tarjeta gráfica RTX 5070", "Componentes", "Tecnología"],
  ["SSD NVMe 1TB", "Componentes", "Tecnología"],
  ["televisor OLED 55", "Televisores", "Tecnología"],
  ["iPhone 17 Pro", "Móviles", "Tecnología"],
  ["Samsung Galaxy Z Flip", "Móviles", "Tecnología"],
  ["portátil ASUS", "Portátiles", "Tecnología"],
  ["portátil HP", "Portátiles", "Tecnología"],
  ["MacBook Pro M4", "Portátiles", "Tecnología"],
  ["procesador AMD Ryzen", "Componentes", "Tecnología"],
  ["procesador Intel Core", "Componentes", "Tecnología"],
  ["placa base", "Componentes", "Tecnología"],
  ["memoria RAM DDR5", "Componentes", "Tecnología"],
  ["fuente de alimentación ATX", "Componentes", "Tecnología"],
  ["disco duro externo", "Componentes", "Tecnología"],
  ["monitor ultrapanorámico", "Monitores", "Tecnología"],
  ["monitor oficina 24 pulgadas", "Monitores", "Tecnología"],
  ["ratón gaming", "Periféricos", "Tecnología"],
  ["teclado inalámbrico", "Periféricos", "Tecnología"],
  ["auriculares gaming", "Auriculares", "Tecnología"],
  ["webcam", "Periféricos", "Tecnología"],
  ["micrófono USB", "Periféricos", "Tecnología"],
  ["robot aspirador Roborock", "Limpieza", "Hogar"],
  ["aspiradora Dyson", "Limpieza", "Hogar"],
  ["freidora de aire", "Cocina", "Hogar"],
  ["cafetera superautomática De'Longhi", "Cocina", "Hogar"],
  ["cafetera Nespresso", "Cocina", "Hogar"],
  ["robot de cocina", "Cocina", "Hogar"],
  ["purificador de aire", "Hogar", "Hogar"],
  ["cepillo eléctrico Oral-B", "Cuidado personal", "Hogar"],
  ["silla gaming", "Muebles", "Hogar"],
];
const PER_QUERY = 16; // productos distintos como mucho por búsqueda

/* ─── Entorno ───────────────────────────────────────────────── */

const env: Record<string, string> = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const KEY = env.SERPAPI_KEY;
const DB = env.DATABASE_URL;
if (!KEY || !DB) {
  console.error("Faltan SERPAPI_KEY o DATABASE_URL en .env.local");
  process.exit(1);
}

const CACHE = "scripts/.cache/serpapi";
const IMAGES = "public/catalog";
mkdirSync(CACHE, { recursive: true });
mkdirSync(IMAGES, { recursive: true });

/* ─── 1. Buscar en Google Shopping ──────────────────────────── */

interface ShoppingResult {
  title?: string;
  source?: string;
  extracted_price?: number;
  product_link?: string;
  link?: string;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  product_id?: string;
  delivery?: string;
}

let spent = 0;
async function search(q: string): Promise<ShoppingResult[]> {
  const file = `${CACHE}/${normalizeText(q).replace(/[^a-z0-9]+/g, "-")}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ engine: "google_shopping", q, gl: "es", hl: "es", google_domain: "google.es", api_key: KEY }).toString();
  const res = await fetch(url);
  spent++;
  if (!res.ok) throw new Error(`SerpApi respondió ${res.status} para «${q}»: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { shopping_results?: ShoppingResult[]; error?: string };
  if (json.error) throw new Error(`SerpApi: ${json.error}`);
  const results = json.shopping_results ?? [];
  writeFileSync(file, JSON.stringify(results));
  return results;
}

/* ─── 2. Agrupar por producto ───────────────────────────────── */

interface Item {
  id: string;
  name: string;
  category: string;
  list: List;
  thumb: string | null;
  offers: Map<string, { priceCents: number; url: string; shipping: string | null }>;
}

const items = new Map<string, Item>();

for (const [q, category, list] of QUERIES) {
  const results = await search(q);
  // Precio mediano de la búsqueda: sirve para descartar precios absurdos (cuotas mensuales, accesorios)
  const prices = results.map((r) => r.extracted_price ?? 0).filter((p) => p > 0).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  let added = 0;
  for (const r of results) {
    if (added >= PER_QUERY) break;
    const store = normalizeStore(r.source);
    const price = r.extracted_price;
    if (!r.title || !store || !price || price <= 0) continue;
    if (isAccessory(r.title) || price < median * 0.3) continue;
    const key = groupKey(r.title);
    const id = catalogId(key);
    let item = items.get(id);
    if (!item) {
      item = { id, name: r.title.trim(), category, list, thumb: r.serpapi_thumbnail ?? r.thumbnail ?? null, offers: new Map() };
      items.set(id, item);
      added++;
    }
    const priceCents = Math.round(price * 100);
    const prev = item.offers.get(store);
    if (!prev || priceCents < prev.priceCents) {
      item.offers.set(store, { priceCents, url: r.link ?? r.product_link ?? "", shipping: r.delivery ?? null });
    }
  }
  console.log(`«${q}»: ${results.length} resultados, ${added} productos nuevos`);
}

/* ─── 3. Descargar las fotos ────────────────────────────────── */

async function saveImage(item: Item): Promise<string | null> {
  const out = `${IMAGES}/${item.id}.webp`;
  if (existsSync(out)) return `/catalog/${item.id}.webp`;
  if (!item.thumb) return null;
  try {
    const res = await fetch(item.thumb, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 10 })
      .resize(208, 208, { fit: "contain", background: "#ffffff" })
      .extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#ffffff" })
      .webp({ quality: 80 })
      .toFile(out);
    return `/catalog/${item.id}.webp`;
  } catch {
    return null;
  }
}

const list = [...items.values()].filter((i) => i.offers.size > 0);
const images = new Map<string, string | null>();
for (let i = 0; i < list.length; i += 8) {
  const batch = list.slice(i, i + 8);
  const saved = await Promise.all(batch.map(saveImage));
  batch.forEach((item, k) => images.set(item.id, saved[k]));
  process.stdout.write(`\rFotos: ${Math.min(i + 8, list.length)}/${list.length}`);
}
console.log();

/* ─── 4. Guardar en la base de datos ────────────────────────── */

const sql = neon(DB);
let offersCount = 0;
for (const item of list) {
  const image = images.get(item.id) ?? null;
  if (!image) continue; // sin foto no lo incluimos: el buscador se vería pobre
  await sql`
    insert into catalog_product (id, name, category, list, image, search_text)
    values (${item.id}, ${item.name}, ${item.category}, ${item.list}, ${image}, ${normalizeText(item.name)})
    on conflict (id) do update set name = excluded.name, category = excluded.category, list = excluded.list,
      image = excluded.image, search_text = excluded.search_text`;
  await sql`delete from catalog_offer where product_id = ${item.id}`;
  for (const [store, o] of item.offers) {
    await sql`
      insert into catalog_offer (product_id, store, price_cents, url, shipping)
      values (${item.id}, ${store}, ${o.priceCents}, ${o.url}, ${o.shipping})`;
    offersCount++;
  }
}

// Quita del catálogo lo que ya no pasa los filtros (los productos que alguien sigue no se tocan)
const keep = list.filter((i) => images.get(i.id)).map((i) => i.id);
const removed = await sql`delete from catalog_product where not (id = any(${keep})) returning id`;
console.log(`Quitados del catálogo: ${removed.length}`);

const withImage = keep.length;
const stores = new Map<string, number>();
for (const i of list) for (const s of i.offers.keys()) stores.set(s, (stores.get(s) ?? 0) + 1);

console.log(`\nListo: ${withImage} productos con foto y ${offersCount} precios guardados.`);
console.log(`Búsquedas gastadas en esta ejecución: ${spent} (el resto venía de la caché).`);
console.log("Tiendas:", [...stores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, n]) => `${s} (${n})`).join(", "));
