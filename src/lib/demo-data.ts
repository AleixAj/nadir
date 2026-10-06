// Data for the demo account. Stores and products are real, but prices are
// approximate (not fetched live) and the price history is simulated.
// Series, store offers and the demo search live in series.ts, offers.ts and demo-catalog.ts.
import { ago, fd } from "./format";
import { makeSeries, type Shape } from "./series";

// A list the user groups products in (name and colour are up to them)
export interface ProductList {
  id: string;
  name: string;
  color: string;
}

// Lists every new account and the demo start with
export const DEFAULT_LISTS: ProductList[] = [
  { id: "tecnologia", name: "Tecnología", color: "#2563eb" },
  { id: "hogar", name: "Hogar", color: "#0d9488" },
];

// Colours offered when creating a list (any other can be picked too)
export const LIST_COLORS = ["#ea580c", "#dc2626", "#db2777", "#9333ea", "#2563eb", "#0891b2", "#0d9488", "#16a34a", "#ca8a04", "#64748b"];
export type AlertStatus = "activa" | "alcanzado" | "pausada" | "none";

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
  // Id of the list it belongs to, or null if it's not in any list
  list: string | null;
  icon: ProductIcon;
  /** Product photo (in /public). Falls back to the icon. */
  image?: string;
  /** Current price at the best store */
  cur: number;
  /** Price 7 days ago */
  prev7: number;
  /** All-time low */
  min: number;
  /** Days since the all-time low */
  minAgo: number;
  store: string;
  target: number | null;
  alert: AlertStatus;
  stores: number;
  since: string;
  checked: number;
  shape?: Shape;
  /** One price per day, oldest (364 days ago) first */
  series: number[];
  /** 7 day change, in % */
  ch: number;
  // Only used by real accounts:
  url?: string;
  lastError?: string | null;
  /** Date of the last price (ISO). Defaults to the demo "today". */
  endDate?: string;
  /** Test catalog: simulated price and offers from several stores */
  simulated?: boolean;
  offers?: { store: string; price: number; url: string; shipping: string | null; shipCents: number | null }[];
}

type Raw = Omit<Product, "series" | "ch">;

const RAW: Raw[] = [
  { id: "sony-wh-1000xm6", name: "Sony WH-1000XM6", list: "tecnologia", icon: "headphones", cur: 379, prev7: 399, min: 349, minAgo: 58, store: "Amazon", target: 359, alert: "activa", stores: 5, since: "12 mar", checked: 6 },
  { id: "iphone-17", shape: "launch", name: "Apple iPhone 17 256 GB", list: "tecnologia", icon: "phone", cur: 959, prev7: 959, min: 929, minAgo: 34, store: "MediaMarkt", target: 899, alert: "activa", stores: 4, since: "2 jun", checked: 4 },
  { id: "galaxy-s25", shape: "launch", name: "Samsung Galaxy S25 256 GB", list: "tecnologia", icon: "phone", cur: 699, prev7: 749, min: 659, minAgo: 120, store: "Amazon", target: 650, alert: "activa", stores: 5, since: "3 abr", checked: 6 },
  { id: "pixel-10", shape: "launch", name: "Google Pixel 10 128 GB", list: "tecnologia", icon: "phone", cur: 749, prev7: 799, min: 729, minAgo: 143, store: "PcComponentes", target: 750, alert: "alcanzado", stores: 4, since: "9 feb", checked: 9 },
  { id: "airpods-pro-3", shape: "volatile", name: "Apple AirPods Pro 3", list: "tecnologia", icon: "headphones", cur: 239, prev7: 249, min: 229, minAgo: 170, store: "Amazon", target: null, alert: "none", stores: 5, since: "27 feb", checked: 6 },
  { id: "mx-keys-s", shape: "volatile", name: "Logitech MX Keys S", list: "tecnologia", icon: "keyboard", cur: 99.99, prev7: 109.99, min: 89.99, minAgo: 96, store: "PcComponentes", target: 95, alert: "activa", stores: 4, since: "21 may", checked: 9 },
  { id: "keychron-k8-pro", shape: "stable", name: "Keychron K8 Pro", list: "tecnologia", icon: "keyboard", cur: 119, prev7: 119, min: 109, minAgo: 250, store: "Amazon", target: null, alert: "none", stores: 2, since: "30 dic", checked: 6 },
  { id: "mx-master-3s", shape: "volatile", name: "Logitech MX Master 3S", list: "tecnologia", icon: "mouse", cur: 89.99, prev7: 99.99, min: 74.99, minAgo: 300, store: "Amazon", target: null, alert: "none", stores: 4, since: "6 nov", checked: 6 },
  { id: "roborock-qrevo-s", shape: "launch", name: "Roborock Qrevo S", list: "hogar", icon: "robot", cur: 399, prev7: 449, min: 369, minAgo: 45, store: "El Corte Inglés", target: 380, alert: "activa", stores: 4, since: "11 jul", checked: 4 },
  { id: "delonghi-magnifica-s", shape: "volatile", name: "De'Longhi Magnifica S", list: "hogar", icon: "coffee", cur: 299, prev7: 309, min: 269, minAgo: 201, store: "Amazon", target: null, alert: "none", stores: 4, since: "18 ene", checked: 6 },
  { id: "cosori-dual-blaze", name: "Cosori Dual Blaze 6,4 L", list: "hogar", icon: "kitchen", cur: 139.99, prev7: 129.99, min: 109.99, minAgo: 80, store: "Amazon", target: 115, alert: "pausada", stores: 3, since: "14 abr", checked: 12 },
  { id: "dyson-v15", shape: "stable", name: "Dyson V15 Detect Absolute", list: "hogar", icon: "wind", cur: 549, prev7: 549, min: 499, minAgo: 110, store: "El Corte Inglés", target: null, alert: "none", stores: 3, since: "8 mar", checked: 4 },
];

export const change7d = (cur: number, prev7: number) => ((cur - prev7) / prev7) * 100;

// Demo product photo from its id (images from Amazon.es)
export const demoPhoto = (id: string) => `/products/${id}.webp`;

export const DEMO_PRODUCTS: Product[] = RAW.map((p, i) => ({
  ...p,
  image: demoPhoto(p.id),
  series: makeSeries(p, i + 1),
  ch: change7d(p.cur, p.prev7),
}));

export const minDate = (p: Product) => fd(ago(p.minAgo, p.endDate ? new Date(p.endDate) : undefined));

/** Latest price drops on the dashboard: [id, store, when] */
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

/** Store that fails in the demo, to show the error state. */
export const FAILING_STORE = "Worten";

export const SUPPORTED_STORES = ["Amazon", "PcComponentes", "MediaMarkt", "El Corte Inglés", "Fnac"];

/** Featured product, used in the landing preview and the sample email. */
export const FEATURED_ID = "sony-wh-1000xm6";
