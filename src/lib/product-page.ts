// Reads a product page: name, image and price.
// Uses the data stores publish for search engines and social networks:
// schema.org structured data (JSON-LD, type "Product") and Open Graph tags.
// Pure functions (no network) so they can be tested with sample HTML.

export interface ProductInfo {
  name: string;
  image: string | null;
  /** Price in cents */
  priceCents: number;
  currency: string;
}

// Stores

const KNOWN_STORES: Record<string, string> = {
  "amazon.es": "Amazon",
  "pccomponentes.com": "PcComponentes",
  "mediamarkt.es": "MediaMarkt",
  "elcorteingles.es": "El Corte Inglés",
  "fnac.es": "Fnac",
  "worten.es": "Worten",
  "carrefour.es": "Carrefour",
  "decathlon.es": "Decathlon",
  "coolmod.com": "Coolmod",
  "ikea.com": "IKEA",
};

// Readable store name from a URL, e.g. "https://www.fnac.es/..." gives "Fnac"
export function storeName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  const known = Object.keys(KNOWN_STORES).find((d) => host === d || host.endsWith("." + d));
  if (known) return KNOWN_STORES[known];
  // Unknown store: use the domain name without the extension, capitalized
  const base = host.split(".").slice(-2, -1)[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// URL safety

// Private and reserved IPv4 ranges (local network, loopback, link-local, carrier NAT)
const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/**
 * Checks that the URL is a public web page.
 * The server is going to download it, so internal addresses (localhost,
 * private IPs, unusual ports) are blocked to prevent SSRF attacks.
 */
export function checkPublicUrl(input: string): { ok: true; url: URL } | { ok: false; reason: string } {
  const blocked = { ok: false as const, reason: "Dirección no permitida." };
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "No es una dirección web válida." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "La dirección debe empezar por https://" };
  if (url.username || url.password) return { ok: false, reason: "La dirección no puede llevar usuario ni contraseña." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "Puerto no permitido." };

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return blocked;
  }
  // No IPv6 addresses
  if (host.startsWith("[") || host.includes(":")) return blocked;
  const isIPv4 = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (isIPv4 && PRIVATE_V4.some((r) => r.test(host))) return blocked;
  // Hostnames without a dot (like "intranet") are internal
  if (!isIPv4 && !host.includes(".")) return blocked;

  url.hash = "";
  return { ok: true, url };
}

// Prices

// Anything above this is surely a parsing mistake (and would not fit the database column)
const MAX_PRICE_EUROS = 1_000_000;

const toCents = (n: number) => (Number.isFinite(n) && n > 0 && n <= MAX_PRICE_EUROS ? Math.round(n * 100) : null);

/**
 * Converts a price written in any format to cents:
 * "1.299,00 €" = 129900, "1,299.00" = 129900, "249" = 24900, 89.99 = 8999
 */
export function parsePriceToCents(value: unknown): number | null {
  if (typeof value === "number") return toCents(value);
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Both: the last one is the decimal separator, the other one is for thousands
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Only commas: decimal if 1 or 2 digits follow ("89,99"), thousands if 3 ("1,299")
    if (/,\d{1,2}$/.test(s)) s = s.replace(/,(?=\d{1,2}$)/, ".");
    s = s.replace(/,/g, "");
  } else if (/\.\d{3}$/.test(s)) {
    // "1.299" is thousands
    s = s.replace(/\./g, "");
  }
  return toCents(parseFloat(s));
}

// HTML

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Number entity to its character. Invalid numbers are dropped instead of throwing
function fromCode(code: number) {
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => fromCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

// Value of a <meta property|name|itemprop="key" content="..."> tag
function meta(html: string, key: string): string | null {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${k}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  return content ? decodeEntities(content.trim()) : null;
}

// Text inside <title>, or "" if there isn't one
function pageTitle(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeEntities(title?.trim() ?? "");
}

type Json = Record<string, unknown>;

// Every object in the JSON-LD blocks, flattening arrays and @graph
function jsonLdObjects(html: string): Json[] {
  const out: Json[] = [];
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      out.push(v as Json);
      const graph = (v as Json)["@graph"];
      if (graph) walk(graph);
    }
  };
  for (const b of blocks) {
    try {
      walk(JSON.parse(b[1].trim()));
    } catch {
      // Broken JSON, skip this block
    }
  }
  return out;
}

const isProduct = (o: Json) => {
  const t = o["@type"];
  return Array.isArray(t) ? t.includes("Product") : t === "Product";
};

// "image" can be a string, an array or an ImageObject
function firstImage(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return firstImage(v[0]);
  if (v && typeof v === "object") return firstImage((v as Json).url ?? (v as Json).contentUrl);
  return null;
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

// Cheapest price among the product's offers
function offerPrice(offers: unknown): { cents: number; currency?: string } | null {
  let best: { cents: number; currency?: string } | null = null;
  for (const o of toArray(offers)) {
    if (!o || typeof o !== "object") continue;
    const offer = o as Json;
    const spec = offer.priceSpecification as Json | undefined;
    const cents = parsePriceToCents(offer.price ?? offer.lowPrice ?? spec?.price);
    const currency = (offer.priceCurrency ?? spec?.priceCurrency) as string | undefined;
    if (cents && (!best || cents < best.cents)) best = { cents, currency };
  }
  return best;
}

/**
 * Gets the name, image and price from a product page's HTML.
 * Returns null if it can't find at least a name and a price.
 */
export function parseProductPage(html: string, pageUrl: string): ProductInfo | null {
  const product = jsonLdObjects(html).find(isProduct);

  // JSON-LD first
  let name = typeof product?.name === "string" ? decodeEntities(product.name.trim()) : null;
  let image = firstImage(product?.image);
  const offer = product ? offerPrice(product.offers) : null;
  let priceCents = offer?.cents ?? null;
  let currency = offer?.currency ?? null;

  // Then fill the gaps with meta tags
  name ??= meta(html, "og:title") ?? pageTitle(html);
  image ??= meta(html, "og:image") ?? meta(html, "twitter:image");
  priceCents ??=
    parsePriceToCents(meta(html, "product:price:amount")) ??
    parsePriceToCents(meta(html, "og:price:amount")) ??
    parsePriceToCents(meta(html, "price"));
  currency ??= meta(html, "product:price:currency") ?? meta(html, "og:price:currency") ?? meta(html, "priceCurrency") ?? "EUR";

  if (!name || !priceCents) return null;

  // Turn relative image paths into absolute URLs
  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
    } catch {
      image = null;
    }
  }

  return { name: name.slice(0, 200), image, priceCents, currency: currency.toUpperCase().slice(0, 3) };
}
