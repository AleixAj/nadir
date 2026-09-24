// Utilidades del catálogo de prueba. Sin dependencias: las usa también el script
// de carga (scripts/seed-catalog.ts), que se ejecuta directamente con Node.

/** Minúsculas y sin tildes, para buscar y comparar. */
export const normalizeText = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Tiendas que entran en el catálogo: grandes cadenas y tiendas oficiales de marca.
 * Se dejan fuera tiendas pequeñas desconocidas, segunda mano y operadoras
 * (que publican precios a plazos, no el precio total).
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
  [/back ?market/, "Back Market"],
  [/phone ?house/, "Phone House"],
  [/leroy/, "Leroy Merlin"],
  [/decathlon/, "Decathlon"],
  [/^ikea/, "IKEA"],
  [/miravia/, "Miravia"],
  [/rakuten/, "Rakuten"],
  [/^game$|game\.es/, "GAME"],
  [/^apple$/, "Apple"],
  [/^samsung/, "Samsung"],
  [/^xiaomi|mi\.com/, "Xiaomi"],
  [/^lenovo/, "Lenovo"],
  [/^asus store|^asus store by/, "ASUS Store"],
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
];

/**
 * Nombre limpio de la tienda a partir del "source" de Google Shopping
 * ("Amazon.es" → "Amazon"). Devuelve null si no es una tienda del catálogo.
 */
export function normalizeStore(source: string | undefined | null): string | null {
  if (!source) return null;
  const s = normalizeText(source);
  return STORES.find(([re]) => re.test(s))?.[1] ?? null;
}

/** Accesorios y recambios que aparecen al buscar el producto principal. */
const ACCESSORY =
  /\b(funda|fundas|carcasa|protector|templado|case|clear|cable|cargador|soporte|correa|skin|pegatina|recambio|repuesto|adaptador|reparacion|lcd|tapa trasera|vinilo)\b/;

export const isAccessory = (title: string) => ACCESSORY.test(normalizeText(title));

/** Clave para agrupar el mismo producto vendido en tiendas distintas. */
export function groupKey(title: string): string {
  return normalizeText(title)
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\b(nuevo|new|oferta|envio gratis|libre|version espanola|es)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

/** Hash corto y estable (FNV-1a) para ids y semillas. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Id legible y estable: "sony-wh-1000xm6-auriculares-3f9a1c" */
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

/** Número pseudoaleatorio entre 0 y 1, siempre el mismo para la misma semilla. */
export function seeded(seed: string): number {
  let x = hash(seed) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

/** Precio "de tienda": entero o acabado en ,99 (en céntimos). */
export const storePrice = (cents: number, r: number) => {
  const euros = Math.max(1, Math.round(cents / 100));
  return r < 0.5 ? euros * 100 - 1 : euros * 100;
};

/**
 * Siguiente precio simulado de un producto del catálogo (en céntimos).
 * Casi siempre se queda igual; a veces cambia un poco y, de vez en cuando,
 * hay una oferta. Nunca se aleja demasiado del precio real de partida.
 */
export function simulateNextPrice(prevCents: number, baseCents: number, seed: string): number {
  const r = seeded(seed);
  const r2 = seeded(seed + "·2");
  let next = prevCents;
  if (r < 0.62) {
    next = prevCents; // sin cambios
  } else if (r < 0.84) {
    next = prevCents * (1 + (r2 - 0.5) * 0.06); // ±3 %
  } else if (r < 0.95) {
    next = prevCents * (1 - 0.05 - r2 * 0.08); // oferta: −5 % a −13 %
  } else {
    next = baseCents * (1 + r2 * 0.04); // vuelve cerca de su precio normal
  }
  const min = baseCents * 0.72;
  const max = baseCents * 1.12;
  next = Math.min(max, Math.max(min, next));
  return next === prevCents ? prevCents : storePrice(next, r2);
}
