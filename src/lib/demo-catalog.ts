// Small fake catalog for the demo "add product" dialog: search by name,
// detect a product from a store link and turn the result into a followed product.
import { demoPhoto, type Product, type ProductIcon } from "./demo-data";
import { ago, fd, r2 } from "./format";
import { withoutAccents } from "./catalog";
import { makeSeries } from "./series";

/** Products the "add product" search can "find" in the demo. */
export interface CatalogItem {
  slug: string;
  name: string;
  icon: ProductIcon;
  image?: string;
  store: string;
  price: number;
  // Suggested list name, e.g. "Hogar"
  list: string;
  others: string;
}

const CATALOG_RAW: Omit<CatalogItem, "image">[] = [
  { slug: "odyssey-g5", name: 'Samsung Odyssey G5 27"', icon: "desktop", store: "PcComponentes", price: 229, list: "Tecnología", others: "Amazon (234,90 €) y MediaMarkt (239,00 €)" },
  { slug: "sony-wf-1000xm5", name: "Sony WF-1000XM5", icon: "headphones", store: "Amazon", price: 229, list: "Tecnología", others: "MediaMarkt (239,00 €) y Fnac (244,99 €)" },
  { slug: "redmi-note-14-pro", name: "Xiaomi Redmi Note 14 Pro 256 GB", icon: "phone", store: "MediaMarkt", price: 329, list: "Tecnología", others: "Amazon (334,00 €) y PcComponentes (339,00 €)" },
  { slug: "ipad-air-m3", name: 'Apple iPad Air 11" M3', icon: "tablet", store: "El Corte Inglés", price: 699, list: "Tecnología", others: "Amazon (704,00 €) y Fnac (709,00 €)" },
  { slug: "kindle-paperwhite", name: "Kindle Paperwhite", icon: "tablet", store: "Amazon", price: 169.99, list: "Tecnología", others: "MediaMarkt (174,99 €)" },
  { slug: "jbl-flip-6", name: "JBL Flip 6", icon: "speaker", store: "Amazon", price: 99, list: "Tecnología", others: "PcComponentes (104,90 €) y Fnac (109,99 €)" },
  { slug: "philips-airfryer-xxl", name: "Philips Airfryer 5000 XXL", icon: "kitchen", store: "El Corte Inglés", price: 199, list: "Hogar", others: "Amazon (204,99 €) y MediaMarkt (209,00 €)" },
];

export const CATALOG: CatalogItem[] = CATALOG_RAW.map((c) => ({ ...c, image: demoPhoto(c.slug) }));

export const EXAMPLE_URL = "https://www.pccomponentes.com/samsung-odyssey-g5-27";

const URL_RE = /^(https?:\/\/)?(www\.)?(amazon\.es|pccomponentes\.com|mediamarkt\.es|elcorteingles\.es|fnac\.es)\/.+/i;

/** Returns the catalog product for a URL, or null if the URL isn't from a supported store. */
export function detectFromUrl(url: string): CatalogItem | null {
  const u = url.trim();
  if (!URL_RE.test(u)) return null;
  // Match on the first two words of the slug, e.g. "odyssey-g5"
  const hit = CATALOG.find((c) => u.toLowerCase().includes(c.slug.split("-").slice(0, 2).join("-")));
  // Unknown product from a valid store: fall back to the first catalog item
  return hit ?? CATALOG[0];
}

/** Turns a catalog item into a followed product with its own history. */
export function productFromCatalog(c: CatalogItem, target: number | null, seed: number): Product {
  const base = { cur: c.price, prev7: c.price, min: r2(c.price * 0.92), minAgo: 40 + (seed % 90) };
  return {
    id: c.slug,
    name: c.name,
    list: null,
    icon: c.icon,
    image: c.image,
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

/** A search result in the demo. */
export interface DemoHit {
  key: string;
  name: string;
  image?: string;
  icon: ProductIcon;
  store: string;
  price: number;
  // Suggested list name (only for products you don't follow yet)
  list?: string;
  /** Id of the product if you already follow it (to link to its page) */
  followedId?: string;
  catalog?: CatalogItem;
}

/**
 * Searches the demo products. Names that start with the query come first,
 * then names with a word starting with it, then the rest.
 */
export function searchDemo(q: string, followed: Product[], limit = 6): DemoHit[] {
  const t = withoutAccents(q.trim());
  if (t.length < 2) return [];
  const words = t.split(/\s+/);
  const matches = (name: string) => words.every((w) => withoutAccents(name).includes(w));
  // Lower score = better match
  const score = (name: string) => {
    const n = withoutAccents(name);
    if (n.startsWith(t)) return 0;
    if (n.split(/\s+/).some((w) => w.startsWith(words[0]))) return 1;
    return 2;
  };

  const hits: DemoHit[] = [
    ...CATALOG.filter((c) => matches(c.name)).map((c) => ({
      key: "c-" + c.slug,
      name: c.name,
      image: c.image,
      icon: c.icon,
      store: c.store,
      price: c.price,
      list: c.list,
      followedId: followed.find((p) => p.id === c.slug)?.id,
      catalog: c,
    })),
    ...followed
      .filter((p) => matches(p.name) && !CATALOG.some((c) => c.slug === p.id))
      .map((p) => ({ key: "p-" + p.id, name: p.name, image: p.image, icon: p.icon, store: p.store, price: p.cur, followedId: p.id })),
  ];
  // Best match first; on a tie, products you don't follow yet go first
  const followedLast = (h: DemoHit) => (h.followedId ? 1 : 0);
  return hits.sort((a, b) => score(a.name) - score(b.name) || followedLast(a) - followedLast(b)).slice(0, limit);
}
