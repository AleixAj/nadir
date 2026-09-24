// Helpers for the sample catalog. No dependencies: the seed script
// (scripts/seed-catalog.ts) also imports this file and runs it directly with Node.

/** Lowercase, no accents and single spaces, for searching and comparing. */
export const normalizeText = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Stores allowed in the catalog: big chains and official brand stores.
 * Small unknown shops, second-hand sites and phone carriers are left out
 * (carriers show monthly instalments, not the full price).
 */
const STORES: [RegExp, string][] = [
  [/amazon/, "Amazon"],
  [/pccomponentes/, "PcComponentes"],
  [/media ?markt/, "MediaMarkt"],
  [/corte ingl/, "El Corte Inglés"],
  [/fnac/, "Fnac"],
  [/worten/, "Worten"],
  [/carrefour/, "Carrefour"],
  [/alcampo/, "Alcampo"],
  [/^lidl/, "Lidl"],
  [/coolmod/, "Coolmod"],
  [/alternate/, "Alternate"],
  [/neobyte/, "Neobyte"],
  [/powerplanet/, "PowerPlanet"],
  [/^ldlc/, "LDLC"],
  [/techinn/, "Techinn"],
  [/phone ?house/, "Phone House"],
  [/leroy/, "Leroy Merlin"],
  [/decathlon/, "Decathlon"],
  [/^ikea/, "IKEA"],
  [/rakuten/, "Rakuten"],
  [/^game$|game\.es/, "GAME"],
  [/^apple$/, "Apple"],
  [/^samsung/, "Samsung"],
  [/^xiaomi|mi\.com/, "Xiaomi"],
  [/^lenovo/, "Lenovo"],
  [/^asus store/, "ASUS Store"],
  [/^hp store/, "HP Store"],
  [/^msi/, "MSI"],
  [/^corsair/, "Corsair"],
  [/^logitech/, "Logitech"],
  [/^razer/, "Razer"],
  [/^jbl/, "JBL"],
  [/^lg /, "LG"],
  [/nintendo store/, "Nintendo Store"],
  [/nespresso/, "Nespresso"],
  [/delonghi|de'longhi/, "De'Longhi"],
  [/^cecotec/, "Cecotec"],
  [/^oral-b/, "Oral-B"],
  [/^roborock/, "Roborock"],
  [/^dyson/, "Dyson"],
  [/^bissell/, "Bissell"],
  [/^levoit/, "Levoit"],
  [/energy sistem/, "Energy Sistem"],
  // Smaller Spanish chains and specialist shops with a long track record
  [/tien ?21/, "Tien21"],
  [/euronics/, "Euronics"],
  [/^milar/, "Milar"],
  [/^expert/, "Expert"],
  [/electro ?depot/, "Electro Depot"],
  [/mi ?electro/, "Mi Electro"],
  [/k-?tuin/, "K-tuin"],
  [/macnificos/, "Macnificos"],
  [/^pixmania/, "Pixmania"],
  [/hipercor/, "Hipercor"],
  [/eroski/, "Eroski"],
  [/^conforama/, "Conforama"],
  [/^pc ?box/, "PCBox"],
  [/^vibbo|^aussar/, "Aussar"],
  // Official brand stores
  [/^oneplus/, "OnePlus"],
  [/^google store/, "Google Store"],
  [/^sony/, "Sony"],
  [/^dell/, "Dell"],
  [/^acer/, "Acer"],
  [/^garmin/, "Garmin"],
  [/^bose/, "Bose"],
  [/^philips/, "Philips"],
  [/^marshall/, "Marshall"],
  [/^sonos/, "Sonos"],
  [/ultimate ears/, "Ultimate Ears"],
];

// Stores we never include, even with good ratings
const BLOCKED = /ebay|second ?best|back ?market|reacondicionad|refurb|swappie|resell|outlet|miravia|aliexpress|wallapop|temu|shein|joom|fruugo|wish|vinted|milanuncios|productpine|cash converters|cex|rebuy|movistar|orange|vodafone|yoigo|simyo|grover|rentik/;

// Minimum Google rating and number of reviews for a store we don't know
const MIN_RATING = 4.3;
const MIN_REVIEWS = 200;

// "Tienda X - Seller" becomes "Tienda X", "cartucho.es" becomes "cartucho"
function cleanStoreName(source: string): string {
  return source
    .replace(/\s*-\s*seller$/i, "")
    .replace(/\.(es|com|net|eu)$/i, "")
    .replace(/^[^\p{L}\p{N}]+/u, "") // leading symbols
    .trim();
}

// Names taken from a domain come in lowercase, so "cartucho" becomes "Cartucho"
function capitalizeIfLowercase(name: string): string {
  if (name !== name.toLowerCase()) return name;
  return name[0].toUpperCase() + name.slice(1);
}

/**
 * Is the store trustworthy? Yes if it's a known store, or if Google gives it
 * at least 4.3 stars with 200 or more reviews. Returns its clean name, or null.
 */
export function trustedStore(source: string | undefined | null, rating?: number | null, reviews?: number | null): string | null {
  if (!source) return null;
  if (BLOCKED.test(normalizeText(source))) return null;

  const known = normalizeStore(source);
  if (known) return known;

  const wellRated = (rating ?? 0) >= MIN_RATING && (reviews ?? 0) >= MIN_REVIEWS;
  if (!wellRated) return null;

  const clean = cleanStoreName(source);
  if (clean.length < 2 || clean.length > 30) return null;
  return capitalizeIfLowercase(clean);
}

// Parses "1.540,80 €" to 154080 cents. Returns null if there is no price.
export function parseEuros(text: string | undefined | null): number | null {
  if (!text) return null;
  // First number in the text, Spanish style: "." for thousands, "," for decimals
  const match = /(\d[\d.]*(?:,\d{1,2})?)/.exec(text);
  if (!match) return null;
  const euros = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  return euros > 0 ? Math.round(euros * 100) : null;
}

// Words that don't identify the product (product type, colours, filler)
const GENERIC = new Set(
  "ia ai ram pulgadas camara altavoz altavoces portatil bluetooth inalambrico inalambricos auriculares smartphone movil telefono libre dual sim negro negra blanco blanca azul gris plata rojo verde rosa con sin para de del la el los las y en version global espanola nuevo precintado color".split(" "),
);

// Storage sizes like "256gb" or "1tb"
const STORAGE = /^\d+(gb|tb)$/;

// Words that make it a different product ("iPhone 17" vs "iPhone 17 Pro")
const VARIANTS = ["pro", "max", "ultra", "plus", "lite", "mini", "fe", "se", "air", "neo"];

const hasDigit = (w: string) => /\d/.test(w);
const isStorage = (w: string) => STORAGE.test(w);
// Words with a number that are not storage, like "s25", "13r" or "1000xm6"
const isModelCode = (w: string) => hasDigit(w) && !isStorage(w);
const isPlainNumber = (w: string) => /^\d+$/.test(w);

// Splits a title into normalized words, writing storage sizes the same way
function words(title: string): string[] {
  let text = normalizeText(title);
  // "S25+" becomes "s25 plus"
  text = text.replace(/\+/g, " plus ");
  // "12/256GB" or "12GB/256GB" becomes "12gb 256gb"
  text = text.replace(/(\d+)\s*(?:gb)?\s*\/\s*(\d+)\s*(gb|tb)\b/g, "$1gb $2$3");
  // "256 GB" becomes "256gb"
  text = text.replace(/(\d+)\s*(gb|tb)\b/g, "$1$2");
  // Any other symbol becomes a space
  text = text.replace(/[^\p{L}\p{N} ]/gu, " ");
  return text.split(" ").filter(Boolean);
}

// Main part of a product name: the text before the first comma, dash or bracket, max 6 words
export function coreName(name: string): string {
  // Keep only the text before the first separator: "," " - " " | " "(" " / "
  const firstPart = name.split(/,| - | \| |\(| \/ /)[0];
  // And at most its first 6 words
  return firstPart.trim().split(/\s+/).slice(0, 6).join(" ");
}

// Refurbished or second-hand items are not the new product
export const isRefurbished = (title: string) =>
  /reacondicionad|refurbish|renewed|reconditionn|seminuevo|segunda mano|usado|open box|grado [abc]\b/.test(normalizeText(title));

// Their title has a longer model built on one of our plain numbers, e.g. "13r" when ours is "13"
function hasLongerModel(ourWords: string[], ourModels: string[], theirWords: string[]): boolean {
  const ourNumbers = ourModels.filter(isPlainNumber);
  return theirWords.some(
    (w) => isModelCode(w) && !ourWords.includes(w) && ourNumbers.some((n) => w.startsWith(n)),
  );
}

/** Does a title from another store ("theirs") describe the same product as ours? */
export function sameProduct(ours: string, theirs: string): boolean {
  if (isRefurbished(theirs)) return false;

  const ourWords = words(coreName(ours));
  const theirWords = words(theirs);
  const theirSet = new Set(theirWords);

  // 1. All our model codes must appear in their title
  const ourModels = ourWords.filter(isModelCode);
  if (!ourModels.every((w) => theirSet.has(w))) return false;

  // 2. No longer model on top of ours ("13r" when we have "13")
  if (hasLongerModel(ourWords, ourModels, theirWords)) return false;

  // 3. Variant words ("pro", "max"...) must be in both titles or in neither
  if (VARIANTS.some((v) => theirSet.has(v) !== ourWords.includes(v))) return false;

  // 4. If ours has a storage size, theirs must have a matching one
  const ourStorage = ourWords.filter(isStorage);
  const theirStorage = theirWords.filter(isStorage);
  if (ourStorage.length && !ourStorage.some((w) => theirStorage.includes(w))) return false;

  // 5. At least 60% of our meaningful words (brand, product line...) must appear in theirs
  const keyWords = ourWords.filter((w) => !GENERIC.has(w) && !hasDigit(w) && w.length > 1);
  if (!keyWords.length) return true;
  const matches = keyWords.filter((w) => theirSet.has(w)).length;
  return matches / keyWords.length >= 0.6;
}

// "Gratis" gives 0, "+ 3,90 €" gives 390, anything unknown gives null
export function parseShipping(text: string | undefined | null): number | null {
  if (!text) return null;
  if (/gratis|free/i.test(text)) return 0;
  const match = /(\d+(?:[.,]\d{1,2})?)/.exec(text);
  return match ? Math.round(parseFloat(match[1].replace(",", ".")) * 100) : null;
}

/**
 * Clean store name from the Google Shopping "source" field
 * ("Amazon.es" becomes "Amazon"). Returns null if it is not a catalog store.
 */
export function normalizeStore(source: string | undefined | null): string | null {
  if (!source) return null;
  const s = normalizeText(source);
  const store = STORES.find(([pattern]) => pattern.test(s));
  return store ? store[1] : null;
}

/** Accessories and spare parts that show up when searching for the main product. */
const ACCESSORY =
  /\b(funda|fundas|carcasa|protector|templado|case|clear|cable|cargador|soporte|correa|skin|pegatina|recambio|repuesto|adaptador|reparacion|lcd|tapa trasera|vinilo)\b/;

export const isAccessory = (title: string) => ACCESSORY.test(normalizeText(title));

/** Key used to group the same product sold in different stores. */
export function groupKey(title: string): string {
  return normalizeText(title)
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\b(nuevo|new|oferta|envio gratis|libre|version espanola|es)\b/g, " ") // filler words
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

/** Short, stable hash (FNV-1a) for ids and seeds. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Readable, stable id: "sony-wh-1000xm6-auriculares-3f9a1c" */
export function catalogId(key: string): string {
  const slug = key
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 5)
    .join("-")
    .slice(0, 48);
  return `${slug || "producto"}-${hash(key).toString(36).slice(0, 6)}`;
}

/** Pseudo-random number between 0 and 1, always the same for the same seed (xorshift). */
export function seeded(seed: string): number {
  let x = hash(seed) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

/** Store-like price in cents: whole euros, or ending in ,99. */
export const storePrice = (cents: number, r: number) => {
  const euros = Math.max(1, Math.round(cents / 100));
  return r < 0.5 ? euros * 100 - 1 : euros * 100;
};

/**
 * Next simulated price for a catalog product (in cents).
 * Most of the time it stays the same; sometimes it moves a little and
 * now and then there is a deal. It never drifts too far from the real starting price.
 */
export function simulateNextPrice(prevCents: number, baseCents: number, seed: string): number {
  const r = seeded(seed);
  const r2 = seeded(seed + "·2");
  let next = prevCents;
  if (r < 0.62) {
    next = prevCents; // no change
  } else if (r < 0.84) {
    next = prevCents * (1 + (r2 - 0.5) * 0.06); // +/- 3%
  } else if (r < 0.95) {
    next = prevCents * (1 - 0.05 - r2 * 0.08); // deal: -5% to -13%
  } else {
    next = baseCents * (1 + r2 * 0.04); // back near its normal price
  }
  // Keep it between 72% and 112% of the starting price
  const min = baseCents * 0.72;
  const max = baseCents * 1.12;
  next = Math.min(max, Math.max(min, next));
  return next === prevCents ? prevCents : storePrice(next, r2);
}
