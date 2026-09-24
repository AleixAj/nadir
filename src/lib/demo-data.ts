// Datos de la cuenta de demostración. Tiendas y productos son reales; los precios son
// orientativos (no se consultan en directo) y el histórico está simulado.
import { ago, fd, r2 } from "./format";

export type ListName = "Tecnología" | "Hogar";
export type AlertStatus = "activa" | "alcanzado" | "pausada" | "none";

/**
 * Forma del histórico simulado:
 * - launch: sale caro y va bajando con el tiempo (móviles, novedades)
 * - volatile: cambia de precio muy a menudo (típico de marketplaces)
 * - stable: casi no se mueve
 * - random: cambios de vez en cuando
 */
export type Shape = "random" | "launch" | "volatile" | "stable";

export type ProductIcon =
  | "headphones"
  | "phone"
  | "mouse"
  | "robot"
  | "coffee"
  | "desktop"
  | "keyboard"
  | "watch"
  | "kitchen"
  | "tablet"
  | "speaker"
  | "lamp"
  | "blender"
  | "armchair"
  | "wind";

export interface Product {
  id: string;
  name: string;
  list: ListName;
  icon: ProductIcon;
  /** Precio actual en la mejor tienda */
  cur: number;
  /** Precio hace 7 días */
  prev7: number;
  /** Mínimo histórico */
  min: number;
  /** Días que han pasado desde el mínimo */
  minAgo: number;
  store: string;
  target: number | null;
  alert: AlertStatus;
  stores: number;
  since: string;
  checked: number;
  shape?: Shape;
  /** Un precio por día, del más antiguo (hace 364 días) a hoy */
  series: number[];
  /** Variación en 7 días, en % */
  ch: number;
}

export const HISTORY_DAYS = 365;

type Raw = Omit<Product, "series" | "ch">;

const RAW: Raw[] = [
  { id: "sony-wh-1000xm6", name: "Sony WH-1000XM6", list: "Tecnología", icon: "headphones", cur: 379, prev7: 399, min: 349, minAgo: 58, store: "Amazon", target: 359, alert: "activa", stores: 5, since: "12 mar", checked: 6 },
  { id: "iphone-17", shape: "launch", name: "Apple iPhone 17 256 GB", list: "Tecnología", icon: "phone", cur: 959, prev7: 959, min: 929, minAgo: 34, store: "MediaMarkt", target: 899, alert: "activa", stores: 4, since: "2 jun", checked: 4 },
  { id: "galaxy-s25", shape: "launch", name: "Samsung Galaxy S25 256 GB", list: "Tecnología", icon: "phone", cur: 699, prev7: 749, min: 659, minAgo: 120, store: "Amazon", target: 650, alert: "activa", stores: 5, since: "3 abr", checked: 6 },
  { id: "pixel-10", shape: "launch", name: "Google Pixel 10 128 GB", list: "Tecnología", icon: "phone", cur: 749, prev7: 799, min: 729, minAgo: 143, store: "PcComponentes", target: 750, alert: "alcanzado", stores: 4, since: "9 feb", checked: 9 },
  { id: "airpods-pro-3", shape: "volatile", name: "Apple AirPods Pro 3", list: "Tecnología", icon: "headphones", cur: 239, prev7: 249, min: 229, minAgo: 170, store: "Amazon", target: null, alert: "none", stores: 5, since: "27 feb", checked: 6 },
  { id: "mx-keys-s", shape: "volatile", name: "Logitech MX Keys S", list: "Tecnología", icon: "keyboard", cur: 99.99, prev7: 109.99, min: 89.99, minAgo: 96, store: "PcComponentes", target: 95, alert: "activa", stores: 4, since: "21 may", checked: 9 },
  { id: "keychron-k8-pro", shape: "stable", name: "Keychron K8 Pro", list: "Tecnología", icon: "keyboard", cur: 119, prev7: 119, min: 109, minAgo: 250, store: "Amazon", target: null, alert: "none", stores: 2, since: "30 dic", checked: 6 },
  { id: "mx-master-3s", shape: "volatile", name: "Logitech MX Master 3S", list: "Tecnología", icon: "mouse", cur: 89.99, prev7: 99.99, min: 74.99, minAgo: 300, store: "Amazon", target: null, alert: "none", stores: 4, since: "6 nov", checked: 6 },
  { id: "roborock-qrevo-s", shape: "launch", name: "Roborock Qrevo S", list: "Hogar", icon: "robot", cur: 399, prev7: 449, min: 369, minAgo: 45, store: "El Corte Inglés", target: 380, alert: "activa", stores: 4, since: "11 jul", checked: 4 },
  { id: "delonghi-magnifica-s", shape: "volatile", name: "De'Longhi Magnifica S", list: "Hogar", icon: "coffee", cur: 299, prev7: 309, min: 269, minAgo: 201, store: "Amazon", target: null, alert: "none", stores: 4, since: "18 ene", checked: 6 },
  { id: "cosori-dual-blaze", name: "Cosori Dual Blaze 6,4 L", list: "Hogar", icon: "kitchen", cur: 139.99, prev7: 129.99, min: 109.99, minAgo: 80, store: "Amazon", target: 115, alert: "pausada", stores: 3, since: "14 abr", checked: 12 },
  { id: "dyson-v15", shape: "stable", name: "Dyson V15 Detect Absolute", list: "Hogar", icon: "wind", cur: 549, prev7: 549, min: 499, minAgo: 110, store: "El Corte Inglés", target: null, alert: "none", stores: 3, since: "8 mar", checked: 4 },
];

/** Días atrás (desde hoy, 24 sep 2026) de las grandes campañas de ofertas. */
const BLACK_FRIDAY = 300; // 28 nov 2025
const PRIME_DAY = 75; // 11 jul 2026

/**
 * Genera un histórico diario creíble y determinista (misma semilla → misma serie).
 * Garantiza que el mínimo cae el día indicado y que los últimos 7 días
 * van de `prev7` a `cur`.
 */
export function makeSeries(
  p: Pick<Raw, "cur" | "prev7" | "min" | "minAgo" | "shape">,
  seed: number,
  n = HISTORY_DAYS,
): number[] {
  let s = seed * 7919 + 13;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const shape = p.shape ?? "random";
  const hi = Math.max(p.cur, p.prev7) * (shape === "launch" ? 1.22 : 1.12);
  const lo = p.min;
  const floor = lo + (hi - lo) * 0.3;
  // Precios "de tienda": enteros o acabados en ,99
  const q = (v: number) => Math.round(v) - (rnd() < 0.5 ? 0.01 : 0);

  const out: number[] = [];
  if (shape === "launch") {
    // Baja por escalones cada ~5 semanas, del precio de salida al actual
    const end = Math.max(p.cur, p.prev7);
    let v = q(hi);
    for (let i = 0; i < n; i++) {
      if (i % 35 === 0 && i) v = q(hi - (hi - end) * Math.pow(i / n, 0.8) + (rnd() - 0.5) * (hi - end) * 0.08);
      out.push(v);
    }
  } else {
    const prob = shape === "volatile" ? 0.24 : shape === "stable" ? 0.02 : 0.09;
    const top = shape === "stable" ? floor + (hi - floor) * 0.55 : floor;
    let v = q(top + rnd() * (hi - top));
    for (let i = 0; i < n; i++) {
      if (rnd() < prob) v = q(top + rnd() * (hi - top));
      out.push(v);
    }
  }

  // Ofertas de Black Friday y Prime Day (salvo en productos estables)
  if (shape !== "stable") {
    for (const [daysAgo, len, cut] of [
      [BLACK_FRIDAY, 5, 0.1],
      [PRIME_DAY, 2, 0.08],
    ]) {
      const c = n - 1 - daysAgo;
      for (let k = c; k < c + len; k++) if (k >= 0 && k < n - 8) out[k] = Math.max(q(lo + 1), q(out[k] * (1 - cut)));
    }
  }

  const li = n - 1 - p.minAgo;
  const mid = q(lo + (hi - lo) * 0.12);
  for (let k = li - 3; k <= li + 3; k++) if (k >= 0 && k < n - 8 && out[k] > mid) out[k] = mid;
  out[li] = lo;
  if (li + 1 < n - 8) out[li + 1] = lo;
  // Nada puede quedar por debajo del mínimo histórico
  for (let k = 0; k < n; k++) if (out[k] < lo) out[k] = lo;
  out[n - 8] = p.prev7;
  out[n - 7] = p.prev7;
  for (let k = n - 6; k < n - 2; k++) {
    const t = (k - (n - 8)) / 7;
    out[k] =
      p.cur === p.prev7
        ? rnd() < 0.5
          ? p.cur
          : q(p.cur * (1 + rnd() * 0.04))
        : Math.max(Math.min(p.cur, p.prev7), q(p.prev7 + (p.cur - p.prev7) * t));
  }
  out[n - 2] = p.cur;
  out[n - 1] = p.cur;
  return out;
}

export const change7d = (cur: number, prev7: number) => ((cur - prev7) / prev7) * 100;

export const DEMO_PRODUCTS: Product[] = RAW.map((p, i) => ({
  ...p,
  series: makeSeries(p, i + 1),
  ch: change7d(p.cur, p.prev7),
}));

export const minDate = (p: Product) => fd(ago(p.minAgo));

/** Últimas bajadas del panel: [id, tienda, cuándo] */
export const DROPS: [string, string, string][] = [
  ["sony-wh-1000xm6", "Amazon", "hace 2 h"],
  ["pixel-10", "PcComponentes", "hace 5 h"],
  ["mx-master-3s", "Amazon", "hoy, 08:10"],
  ["mx-keys-s", "PcComponentes", "ayer"],
  ["delonghi-magnifica-s", "Amazon", "ayer"],
  ["galaxy-s25", "Amazon", "22 sep"],
];

export interface SentAlert {
  id: string;
  txt: string;
  daysAgo: number;
  time: string;
  channels: string;
}

export const SENT_ALERTS: SentAlert[] = [
  { id: "pixel-10", txt: "Bajó a 749 € en PcComponentes", daysAgo: 0, time: "07:55", channels: "Email y Telegram" },
  { id: "roborock-qrevo-s", txt: "Bajó a 369 € en El Corte Inglés", daysAgo: 45, time: "18:40", channels: "Email" },
  { id: "sony-wh-1000xm6", txt: "Bajó a 349 € en Amazon", daysAgo: 58, time: "11:20", channels: "Email y Telegram" },
  { id: "cosori-dual-blaze", txt: "Bajó a 109,99 € en Amazon", daysAgo: 80, time: "09:02", channels: "Email" },
  { id: "galaxy-s25", txt: "Bajó a 659 € en Amazon", daysAgo: 120, time: "08:15", channels: "Email y Telegram" },
];

export interface Store {
  name: string;
  domain: string;
  count: number;
  last: string;
  time: string;
  resp: string;
  error?: boolean;
}

export const STORES: Store[] = [
  { name: "Amazon", domain: "amazon.es", count: 7, last: "hace 3 min", time: "Hoy, 10:42", resp: "380 ms" },
  { name: "PcComponentes", domain: "pccomponentes.com", count: 8, last: "hace 6 min", time: "Hoy, 10:39", resp: "510 ms" },
  { name: "MediaMarkt", domain: "mediamarkt.es", count: 7, last: "hace 4 min", time: "Hoy, 10:41", resp: "450 ms" },
  { name: "El Corte Inglés", domain: "elcorteingles.es", count: 6, last: "hace 12 min", time: "Hoy, 10:33", resp: "720 ms" },
  { name: "Fnac", domain: "fnac.es", count: 4, last: "hace 9 min", time: "Hoy, 10:36", resp: "640 ms" },
  { name: "Worten", domain: "worten.es", count: 2, last: "hace 1 h 33 min", time: "Hoy, 09:12", resp: "—", error: true },
];

/** Tienda que falla en la demo, para enseñar el estado de error. */
export const FAILING_STORE = "Worten";

export const SUPPORTED_STORES = ["Amazon", "PcComponentes", "MediaMarkt", "El Corte Inglés", "Fnac"];

/** Tiendas con recogida en tienda física */
const PICKUP = new Set(["MediaMarkt", "El Corte Inglés", "Fnac"]);

export interface ShopOffer {
  name: string;
  price?: number;
  ship?: number;
  shipL?: string;
  eta?: string;
  pickup?: boolean;
  error?: boolean;
}

const FEATURED_SHOPS: ShopOffer[] = [
  { name: "Amazon", price: 379, ship: 0, shipL: "Envío gratis", eta: "Mañana" },
  { name: "PcComponentes", price: 374.9, ship: 5.99, shipL: "Envío 5,99 €", eta: "24–48 h" },
  { name: "MediaMarkt", price: 385, ship: 0, shipL: "Recogida en tienda gratis", eta: "Hoy, en tienda", pickup: true },
  { name: "El Corte Inglés", price: 399, ship: 0, shipL: "Envío gratis", eta: "2–3 días" },
  { name: "Worten", error: true },
];

/** Producto destacado: el de la vista previa de la landing y el email de ejemplo. */
export const FEATURED_ID = "sony-wh-1000xm6";

/** Ofertas de cada tienda para un producto. */
export function shopsFor(p: Product): ShopOffer[] {
  if (p.id === FEATURED_ID) return FEATURED_SHOPS;
  const others = SUPPORTED_STORES.filter((n) => n !== p.store).slice(0, p.stores - 1);
  const rows: ShopOffer[] = [{ name: p.store, price: p.cur, ship: 0, shipL: "Envío gratis", eta: "24–48 h" }];
  others.forEach((n, i) => {
    const pickup = PICKUP.has(n) && i === 1;
    const ship = pickup ? 0 : [4.99, 0, 3.95, 0][i % 4];
    rows.push({
      name: n,
      price: Math.round(p.cur * (1.012 + i * 0.03)) - 0.01,
      ship,
      shipL: pickup ? "Recogida en tienda gratis" : ship ? "Envío " + String(ship).replace(".", ",") + " €" : "Envío gratis",
      eta: pickup ? "Hoy, en tienda" : ["3–5 días", "24–48 h", "2–3 días", "24 h"][i % 4],
      pickup,
    });
  });
  return rows;
}

export interface RankedOffer extends ShopOffer {
  total?: number;
  best: boolean;
}

/** Ordena por precio final (precio + envío). Las tiendas con error van al final. */
export function rankOffers(offers: ShopOffer[]): RankedOffer[] {
  const ok = offers
    .filter((s) => !s.error)
    .map((s) => ({ ...s, total: r2((s.price ?? 0) + (s.ship ?? 0)) }))
    .sort((a, b) => a.total - b.total);
  const err = offers.filter((s) => s.error);
  return [...ok.map((s, i) => ({ ...s, best: i === 0 })), ...err.map((s) => ({ ...s, best: false }))];
}

/** Productos que "encuentra" el buscador del modal de añadir. */
export interface CatalogItem {
  slug: string;
  name: string;
  icon: ProductIcon;
  store: string;
  price: number;
  list: ListName;
  others: string;
}

export const CATALOG: CatalogItem[] = [
  { slug: "odyssey-g5", name: 'Samsung Odyssey G5 27"', icon: "desktop", store: "PcComponentes", price: 229, list: "Tecnología", others: "Amazon (234,90 €) y MediaMarkt (239,00 €)" },
  { slug: "sony-wf-1000xm5", name: "Sony WF-1000XM5", icon: "headphones", store: "Amazon", price: 229, list: "Tecnología", others: "MediaMarkt (239,00 €) y Fnac (244,99 €)" },
  { slug: "redmi-note-14-pro", name: "Xiaomi Redmi Note 14 Pro 256 GB", icon: "phone", store: "MediaMarkt", price: 329, list: "Tecnología", others: "Amazon (334,00 €) y PcComponentes (339,00 €)" },
  { slug: "ipad-air-m3", name: 'Apple iPad Air 11" M3', icon: "tablet", store: "El Corte Inglés", price: 699, list: "Tecnología", others: "Amazon (704,00 €) y Fnac (709,00 €)" },
  { slug: "kindle-paperwhite", name: "Kindle Paperwhite", icon: "tablet", store: "Amazon", price: 169.99, list: "Tecnología", others: "MediaMarkt (174,99 €)" },
  { slug: "jbl-flip-6", name: "JBL Flip 6", icon: "speaker", store: "Amazon", price: 99, list: "Tecnología", others: "PcComponentes (104,90 €) y Fnac (109,99 €)" },
  { slug: "philips-airfryer-xxl", name: "Philips Airfryer XXL", icon: "kitchen", store: "El Corte Inglés", price: 199, list: "Hogar", others: "Amazon (204,99 €) y MediaMarkt (209,00 €)" },
];

export const EXAMPLE_URL = "https://www.pccomponentes.com/samsung-odyssey-g5-27";

const URL_RE = /^(https?:\/\/)?(www\.)?(amazon\.es|pccomponentes\.com|mediamarkt\.es|elcorteingles\.es|fnac\.es)\/.+/i;

/** Devuelve el producto del catálogo que corresponde a la URL, o null si no se puede leer. */
export function detectFromUrl(url: string): CatalogItem | null {
  const u = url.trim();
  if (!URL_RE.test(u)) return null;
  const hit = CATALOG.find((c) => u.toLowerCase().includes(c.slug.split("-").slice(0, 2).join("-")));
  return hit ?? CATALOG[0];
}

export function searchCatalog(q: string): CatalogItem[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return CATALOG.filter((x) => x.name.toLowerCase().includes(t));
}

/** Convierte un producto del catálogo en un producto seguido, con su histórico. */
export function productFromCatalog(c: CatalogItem, target: number | null, seed: number): Product {
  const base = { cur: c.price, prev7: c.price, min: r2(c.price * 0.92), minAgo: 40 + (seed % 90) };
  return {
    id: c.slug,
    name: c.name,
    list: c.list,
    icon: c.icon,
    ...base,
    store: c.store,
    target,
    alert: target ? "activa" : "none",
    stores: c.others.split(" y ").length + 1,
    since: fd(ago(0)),
    checked: 0,
    series: makeSeries(base, seed),
    ch: 0,
  };
}
