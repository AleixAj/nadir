// Loads the sample catalog: real products from Google Shopping Spain (through SerpApi),
// with their photos and prices in several stores, and saves them to the database.
//
// Usage:  npm run catalog:seed
//
// - Every search is cached in scripts/.cache, so running it again doesn't spend searches.
// - Photos are downloaded once to public/catalog/ (WebP, 240 px, white background).
// - Needs SERPAPI_KEY and DATABASE_URL in .env.local.
// - Step 2b: for the most interesting products it fetches the full product page from
//   Google Shopping (every store that sells it). That costs 1 search per product, so it
//   works in batches: results are cached and each run continues where the last one stopped.
//   Max new searches per run: CATALOG_ENRICH (default 170).
// - Step 2c (optional, needs SERPER_API_KEY): searches each product by its exact name on
//   Serper to find more stores. Only results for the same model are kept.
//   Max per run: SERPER_LIMIT (default 800 products).
// - CATALOG_MIN_STORES: drops products with fewer stores (default 2, without a comparison they're not useful).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import sharp from "sharp";
import { catalogId, groupKey, isAccessory, normalizeStore, normalizeText, coreName, isRefurbished, parseEuros, parseShipping, sameProduct, trustedStore } from "../src/lib/catalog.ts";

// Settings

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
  ["altavoz Marshall Emberton", "Audio", "Tecnología"],
  ["altavoz Bose", "Audio", "Tecnología"],
  ["altavoz Sonos", "Audio", "Tecnología"],
  ["altavoz Sony bluetooth", "Audio", "Tecnología"],
  ["altavoz Ultimate Ears", "Audio", "Tecnología"],
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
const PER_QUERY = 16; // max different products per search

// Environment

// Reads KEY=value lines from an env file, skipping blanks and comments
function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnvFile(".env.local");
const KEY = env.SERPAPI_KEY;
const DB = env.DATABASE_URL;
if (!KEY || !DB) {
  console.error("Missing SERPAPI_KEY or DATABASE_URL in .env.local");
  process.exit(1);
}

const CACHE = "scripts/.cache/serpapi";
const IMAGES = "public/catalog";
mkdirSync(CACHE, { recursive: true });
mkdirSync(IMAGES, { recursive: true });

// Offers from other stores must be within this range of the product's reference price
const MIN_PRICE_RATIO = 0.65;
const MAX_PRICE_RATIO = 1.35;
const priceInRange = (cents: number, anchorCents: number) =>
  cents >= anchorCents * MIN_PRICE_RATIO && cents <= anchorCents * MAX_PRICE_RATIO;

const toCents = (euros: number) => Math.round(euros * 100);

// Middle value of a list of numbers (0 if empty)
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Search Google Shopping

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
  immersive_product_page_token?: string;
  multiple_sources?: boolean;
}

let spent = 0; // SerpApi searches used in this run
async function search(q: string): Promise<ShoppingResult[]> {
  const file = `${CACHE}/${normalizeText(q).replace(/[^a-z0-9]+/g, "-")}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ engine: "google_shopping", q, gl: "es", hl: "es", google_domain: "google.es", api_key: KEY }).toString();
  const res = await fetch(url);
  spent++;
  if (!res.ok) throw new Error(`SerpApi returned ${res.status} for "${q}": ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { shopping_results?: ShoppingResult[]; error?: string };
  if (json.error) throw new Error(`SerpApi: ${json.error}`);
  const results = json.shopping_results ?? [];
  writeFileSync(file, JSON.stringify(results));
  return results;
}

// 2. Group results by product

interface Offer {
  priceCents: number;
  url: string;
  shipping: string | null;
  shippingCents: number | null;
}

interface Item {
  id: string;
  name: string;
  category: string;
  list: List;
  thumb: string | null;
  offers: Map<string, Offer>;
  // Token to fetch the full product page (all stores)
  token: string | null;
  // Google says several stores sell it
  multiple: boolean;
  // Price it had in the search, used to skip other versions of the product
  anchorCents: number;
  // Index of its search in QUERIES (to spread requests across categories)
  query: number;
}

const items = new Map<string, Item>();

for (const [qi, [q, category, list]] of QUERIES.entries()) {
  const results = await search(q);
  // Median price of the search, used to skip silly prices (monthly fees, accessories)
  const searchMedian = median(results.map((r) => r.extracted_price ?? 0).filter((p) => p > 0));
  let added = 0;
  for (const r of results) {
    if (added >= PER_QUERY) break;
    const store = normalizeStore(r.source);
    const price = r.extracted_price;
    if (!r.title || !store || !price || price <= 0) continue;
    if (isAccessory(r.title) || isRefurbished(r.title) || price < searchMedian * 0.3) continue;

    const id = catalogId(groupKey(r.title));
    const priceCents = toCents(price);
    let item = items.get(id);
    if (!item) {
      item = {
        id,
        name: r.title.trim(),
        category,
        list,
        thumb: r.serpapi_thumbnail ?? r.thumbnail ?? null,
        offers: new Map(),
        token: r.immersive_product_page_token ?? null,
        multiple: !!r.multiple_sources,
        anchorCents: priceCents,
        query: qi,
      };
      items.set(id, item);
      added++;
    }
    // Keep the cheapest offer per store
    const prev = item.offers.get(store);
    if (!prev || priceCents < prev.priceCents) {
      item.offers.set(store, { priceCents, url: r.link ?? r.product_link ?? "", shipping: r.delivery ?? null, shippingCents: parseShipping(r.delivery) });
    }
  }
  console.log(`"${q}": ${results.length} results, ${added} new products`);
}

// 2b. All the stores for each product

interface StoreResult {
  name?: string;
  link?: string;
  extracted_price?: number;
  shipping?: string;
  rating?: number;
  reviews?: number;
}

const PRODUCT_CACHE = "scripts/.cache/serpapi-product";
mkdirSync(PRODUCT_CACHE, { recursive: true });
const searchesBefore = spent;

// Searches left this month (this call doesn't use one)
async function searchesLeft(): Promise<number> {
  const res = await fetch(`https://serpapi.com/account.json?api_key=${KEY}`);
  const json = (await res.json()) as { plan_searches_left?: number; total_searches_left?: number };
  return json.total_searches_left ?? json.plan_searches_left ?? 0;
}

async function productStores(item: Item, allowNew: boolean): Promise<StoreResult[] | null> {
  const file = `${PRODUCT_CACHE}/${item.id}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (!allowNew || !item.token) return null;
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({
    engine: "google_immersive_product",
    page_token: item.token,
    more_stores: "true",
    hl: "es",
    gl: "es",
    api_key: KEY,
  }).toString();
  const res = await fetch(url);
  spent++;
  if (!res.ok) return null;
  const json = (await res.json()) as { product_results?: { stores?: StoreResult[] } };
  const stores = json.product_results?.stores ?? [];
  writeFileSync(file, JSON.stringify(stores));
  return stores;
}

const ENRICH = Number(process.env.CATALOG_ENRICH ?? 170);
const RESERVE = Number(process.env.CATALOG_RESERVE ?? 15); // searches we always keep, just in case
let budget = Math.max(0, Math.min(ENRICH, (await searchesLeft()) - RESERVE));
console.log(`\nFull product pages: up to ${budget} new searches in this run.`);

// Candidates: products sold by several stores, taken in turns from each search
// (round-robin) so every category gets some, starting with tech
const byQuery = new Map<number, Item[]>();
for (const item of items.values()) {
  if (!item.token || !item.multiple) continue;
  const group = byQuery.get(item.query) ?? [];
  group.push(item);
  byQuery.set(item.query, group);
}
const queryOrder = [...byQuery.keys()].sort((a, b) => a - b);
const order: Item[] = [];
for (let round = 0; ; round++) {
  let added = false;
  for (const qi of queryOrder) {
    const item = byQuery.get(qi)![round];
    if (item) {
      order.push(item);
      added = true;
    }
  }
  if (!added) break;
}

let enriched = 0;
for (const item of order) {
  const cached = existsSync(`${PRODUCT_CACHE}/${item.id}.json`);
  if (!cached && budget <= 0) continue;
  const stores = await productStores(item, budget > 0);
  if (!cached && stores) budget--;
  if (!stores) continue;
  enriched++;
  // For each store keep the offer closest to the original price
  // (skips other versions: more storage, another colour...)
  for (const st of stores) {
    const name = trustedStore(st.name, st.rating, st.reviews);
    const price = st.extracted_price;
    if (!name || !price || !st.link) continue;
    const cents = toCents(price);
    if (!priceInRange(cents, item.anchorCents)) continue;
    const prev = item.offers.get(name);
    if (prev && Math.abs(prev.priceCents - item.anchorCents) <= Math.abs(cents - item.anchorCents)) continue;
    item.offers.set(name, { priceCents: cents, url: st.link, shipping: st.shipping ?? null, shippingCents: parseShipping(st.shipping) });
  }
}
console.log(`Products with all their stores: ${enriched} (new searches in this step: ${spent - searchesBefore}).`);

// 2c. More stores from Serper

interface SerperResult {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  delivery?: string;
  rating?: number;
  ratingCount?: number;
}

const SERPER_KEY = env.SERPER_API_KEY;
const SERPER_CACHE = "scripts/.cache/serper";
mkdirSync(SERPER_CACHE, { recursive: true });
let serperBudget = SERPER_KEY ? Number(process.env.SERPER_LIMIT ?? 800) : 0;
let serperSpent = 0;

async function serper(item: Item): Promise<SerperResult[] | null> {
  const file = `${SERPER_CACHE}/${item.id}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (serperBudget <= 0) return null;
  serperBudget--;
  const res = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ q: coreName(item.name).replace(/["“”″]/g, ""), gl: "es", hl: "es", num: 40 }),
  });
  serperSpent++;
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) serperBudget = 0; // bad key or no credits left
    console.warn(`\nSerper returned ${res.status} for "${item.name}"`);
    return null;
  }
  const results = ((await res.json()) as { shopping?: SerperResult[] }).shopping ?? [];
  writeFileSync(file, JSON.stringify(results));
  return results;
}

// Products with fewer stores go first, 5 at a time
const SERPER_BATCH = 5;
const bySize = [...items.values()].sort((a, b) => a.offers.size - b.offers.size);
let serperAdded = 0;
for (let i = 0; i < bySize.length; i += SERPER_BATCH) {
  const batch = bySize.slice(i, i + SERPER_BATCH);
  const found = await Promise.all(batch.map(serper));
  batch.forEach((item, k) => {
    for (const r of found[k] ?? []) {
      const name = trustedStore(r.source, r.rating, r.ratingCount);
      const cents = parseEuros(r.price);
      if (!name || !cents || !r.link || !r.title || item.offers.has(name)) continue;
      if (isAccessory(r.title) || !sameProduct(item.name, r.title)) continue;
      if (!priceInRange(cents, item.anchorCents)) continue;
      item.offers.set(name, { priceCents: cents, url: r.link, shipping: r.delivery ?? null, shippingCents: parseShipping(r.delivery) });
      serperAdded++;
    }
  });
  if (SERPER_KEY) process.stdout.write(`\rSerper: ${Math.min(i + SERPER_BATCH, bySize.length)}/${bySize.length}`);
  if (serperSpent) await sleep(1100); // Serper allows 5 requests per second
}
if (SERPER_KEY) console.log(`\nSerper: ${serperAdded} new prices (new searches: ${serperSpent}).`);

// The same product can show up twice with different titles.
// Merge it into the entry that has more stores.
let merged = 0;
const all = [...items.values()].sort((a, b) => b.offers.size - a.offers.size);
for (const [i, keepItem] of all.entries()) {
  if (!items.has(keepItem.id)) continue;
  for (const dup of all.slice(i + 1)) {
    if (!items.has(dup.id) || dup.category !== keepItem.category) continue;
    // Check both ways so a shorter name doesn't swallow a longer one
    if (!sameProduct(keepItem.name, dup.name) || !sameProduct(dup.name, keepItem.name)) continue;
    for (const [store, offer] of dup.offers) {
      if (!keepItem.offers.has(store)) keepItem.offers.set(store, offer);
    }
    items.delete(dup.id);
    merged++;
  }
}
console.log(`Duplicates merged: ${merged}`);

// Last filter: drop prices far from the product's median price
// (another version, another capacity or a store mistake)
let outliers = 0;
for (const item of items.values()) {
  const prices = [...item.offers.values()].map((o) => o.priceCents);
  if (prices.length < 3) continue;
  const mid = median(prices);
  for (const [store, o] of item.offers) {
    if (o.priceCents < mid * 0.7 || o.priceCents > mid * 1.4) {
      item.offers.delete(store);
      outliers++;
    }
  }
}
console.log(`Prices dropped for being far from the rest: ${outliers}`);

const counts = [1, 2, 3, 4, 6].map((n) => `${n}+: ${[...items.values()].filter((i) => i.offers.size >= n).length}`);
console.log(`Products by number of stores: ${counts.join(" · ")}`);

// 3. Download the photos

async function saveImage(item: Item): Promise<string | null> {
  const out = `${IMAGES}/${item.id}.webp`;
  if (existsSync(out)) return `/catalog/${item.id}.webp`;
  if (!item.thumb) return null;
  try {
    const res = await fetch(item.thumb, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // White background, trimmed borders, 208 px image + 16 px padding = 240 px square
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

const MIN_STORES = Number(process.env.CATALOG_MIN_STORES ?? 2);
const IMAGE_BATCH = 8;
const list = [...items.values()].filter((i) => i.offers.size >= MIN_STORES);
const images = new Map<string, string | null>();
for (let i = 0; i < list.length; i += IMAGE_BATCH) {
  const batch = list.slice(i, i + IMAGE_BATCH);
  const saved = await Promise.all(batch.map(saveImage));
  batch.forEach((item, k) => images.set(item.id, saved[k]));
  process.stdout.write(`\rPhotos: ${Math.min(i + IMAGE_BATCH, list.length)}/${list.length}`);
}
console.log();

// 4. Save to the database

const sql = neon(DB);
let offersCount = 0;
for (const item of list) {
  const image = images.get(item.id) ?? null;
  if (!image) continue; // skip products without a photo, search results would look bad
  await sql`
    insert into catalog_product (id, name, category, list, image, search_text)
    values (${item.id}, ${item.name}, ${item.category}, ${item.list}, ${image}, ${normalizeText(item.name)})
    on conflict (id) do update set name = excluded.name, category = excluded.category, list = excluded.list,
      image = excluded.image, search_text = excluded.search_text`;
  await sql`delete from catalog_offer where product_id = ${item.id}`;
  for (const [store, o] of item.offers) {
    await sql`
      insert into catalog_offer (product_id, store, price_cents, url, shipping, shipping_cents)
      values (${item.id}, ${store}, ${o.priceCents}, ${o.url}, ${o.shipping}, ${o.shippingCents})`;
    offersCount++;
  }
}

// Remove products that no longer pass the filters (products someone is tracking are kept)
const keep = list.filter((i) => images.get(i.id)).map((i) => i.id);
const removed = await sql`delete from catalog_product where not (id = any(${keep})) returning id`;
console.log(`Removed from the catalog: ${removed.length}`);

// Offers per store, for the summary
const stores = new Map<string, number>();
for (const i of list) for (const s of i.offers.keys()) stores.set(s, (stores.get(s) ?? 0) + 1);
const topStores = [...stores.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([s, n]) => `${s} (${n})`);

console.log(`\nDone: ${keep.length} products with a photo and ${offersCount} prices saved.`);
console.log(`Searches used in this run: ${spent} (the rest came from the cache).`);
console.log("Stores:", topStores.join(", "));
