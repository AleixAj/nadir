// Lectura de la página de un producto: nombre, foto y precio.
// Se basa en los datos que las tiendas publican para buscadores y redes sociales:
// datos estructurados de schema.org (JSON-LD, tipo "Product") y etiquetas Open Graph.
// Son funciones puras (sin red) para poder probarlas con HTML de ejemplo.

export interface ProductInfo {
  name: string;
  image: string | null;
  /** Precio en céntimos */
  priceCents: number;
  currency: string;
}

/* ─── Tiendas ───────────────────────────────────────────────── */

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

/** Nombre legible de la tienda a partir de la URL: "https://www.fnac.es/..." → "Fnac". */
export function storeName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  const known = Object.keys(KNOWN_STORES).find((d) => host === d || host.endsWith("." + d));
  if (known) return KNOWN_STORES[known];
  const base = host.split(".").slice(-2, -1)[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/* ─── Seguridad de la URL ───────────────────────────────────── */

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/**
 * Comprueba que la URL es una página web pública.
 * El servidor va a descargarla, así que se bloquean direcciones internas
 * (localhost, IPs privadas, puertos raros) para evitar ataques SSRF.
 */
export function checkPublicUrl(input: string): { ok: true; url: URL } | { ok: false; reason: string } {
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
    return { ok: false, reason: "Dirección no permitida." };
  }
  if (host.startsWith("[") || host.includes(":")) return { ok: false, reason: "Dirección no permitida." };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (PRIVATE_V4.some((r) => r.test(host))) return { ok: false, reason: "Dirección no permitida." };
  } else if (!host.includes(".")) {
    return { ok: false, reason: "Dirección no permitida." };
  }
  url.hash = "";
  return { ok: true, url };
}

/* ─── Precios ───────────────────────────────────────────────── */

/**
 * Convierte un precio escrito de cualquier forma a céntimos:
 * "1.299,00 €" → 129900 · "1,299.00" → 129900 · "249" → 24900 · 89.99 → 8999
 */
export function parsePriceToCents(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // El último separador es el decimal; el otro, de miles
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Solo comas: decimal si hay 1 o 2 cifras detrás ("89,99"), miles si hay 3 ("1,299")
    s = /,\d{1,2}$/.test(s) ? s.replace(/,(?=\d{1,2}$)/, ".").replace(/,/g, "") : s.replace(/,/g, "");
  } else if (/\.\d{3}$/.test(s)) {
    // "1.299" → miles
    s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/* ─── HTML ──────────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Valor de una etiqueta <meta property|name|itemprop="key" content="..."> */
function meta(html: string, key: string): string | null {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)\\s*=\\s*["']${k}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  return content ? decodeEntities(content.trim()) : null;
}

type Json = Record<string, unknown>;

/** Todos los objetos de los bloques JSON-LD, aplanando arrays y @graph. */
function jsonLdObjects(html: string): Json[] {
  const out: Json[] = [];
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      out.push(v as Json);
      const g = (v as Json)["@graph"];
      if (g) walk(g);
    }
  };
  for (const b of blocks) {
    try {
      walk(JSON.parse(b[1].trim()));
    } catch {
      // JSON mal formado: se ignora ese bloque
    }
  }
  return out;
}

const isProduct = (o: Json) => {
  const t = o["@type"];
  return Array.isArray(t) ? t.includes("Product") : t === "Product";
};

function firstImage(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return firstImage(v[0]);
  if (v && typeof v === "object") return firstImage((v as Json).url ?? (v as Json).contentUrl);
  return null;
}

function offerPrice(offers: unknown): { cents: number; currency?: string } | null {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  let best: { cents: number; currency?: string } | null = null;
  for (const o of list) {
    if (!o || typeof o !== "object") continue;
    const of = o as Json;
    const spec = of.priceSpecification as Json | undefined;
    const raw = of.price ?? of.lowPrice ?? spec?.price;
    const cents = parsePriceToCents(raw);
    const currency = (of.priceCurrency ?? spec?.priceCurrency) as string | undefined;
    if (cents && (!best || cents < best.cents)) best = { cents, currency };
  }
  return best;
}

/**
 * Extrae nombre, foto y precio del HTML de una página de producto.
 * Devuelve null si no encuentra al menos nombre y precio.
 */
export function parseProductPage(html: string, pageUrl: string): ProductInfo | null {
  const product = jsonLdObjects(html).find(isProduct);

  let name = typeof product?.name === "string" ? decodeEntities(product.name.trim()) : null;
  let image = firstImage(product?.image);
  const offer = product ? offerPrice(product.offers) : null;
  let priceCents = offer?.cents ?? null;
  let currency = offer?.currency ?? null;

  name ??= meta(html, "og:title") ?? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "") ?? null;
  image ??= meta(html, "og:image") ?? meta(html, "twitter:image");
  priceCents ??=
    parsePriceToCents(meta(html, "product:price:amount")) ??
    parsePriceToCents(meta(html, "og:price:amount")) ??
    parsePriceToCents(meta(html, "price"));
  currency ??= meta(html, "product:price:currency") ?? meta(html, "og:price:currency") ?? meta(html, "priceCurrency") ?? "EUR";

  if (!name || !priceCents) return null;

  // Rutas de imagen relativas → absolutas
  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
    } catch {
      image = null;
    }
  }

  return { name: name.slice(0, 200), image, priceCents, currency: currency.toUpperCase().slice(0, 3) };
}
