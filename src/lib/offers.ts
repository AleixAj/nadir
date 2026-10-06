// Store comparison for demo products: made-up offers from several stores,
// and the ranking by final price (price + shipping) that the product page shows.
import { FEATURED_ID, SUPPORTED_STORES, type Product } from "./demo-data";
import { r2 } from "./format";

// Stores that offer in-store pickup
const PICKUP = new Set(["MediaMarkt", "El Corte Inglés", "Fnac"]);

export interface ShopOffer {
  name: string;
  url?: string;
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

// Made-up shipping costs and delivery times, cycled through for the other stores
const SHIP_COSTS = [4.99, 0, 3.95, 0];
const ETAS = ["3–5 días", "24–48 h", "2–3 días", "24 h"];

function shipLabel(ship: number, pickup: boolean) {
  if (pickup) return "Recogida en tienda gratis";
  if (ship) return "Envío " + String(ship).replace(".", ",") + " €";
  return "Envío gratis";
}

/** Offers from each store for a demo product. */
export function shopsFor(p: Product): ShopOffer[] {
  if (p.id === FEATURED_ID) return FEATURED_SHOPS;
  const others = SUPPORTED_STORES.filter((n) => n !== p.store).slice(0, p.stores - 1);
  const rows: ShopOffer[] = [{ name: p.store, price: p.cur, ship: 0, shipL: "Envío gratis", eta: "24–48 h" }];
  others.forEach((name, i) => {
    const pickup = PICKUP.has(name) && i === 1;
    const ship = pickup ? 0 : SHIP_COSTS[i % 4];
    rows.push({
      name,
      // Each extra store is a bit more expensive than the best one
      price: Math.round(p.cur * (1.012 + i * 0.03)) - 0.01,
      ship,
      shipL: shipLabel(ship, pickup),
      eta: pickup ? "Hoy, en tienda" : ETAS[i % 4],
      pickup,
    });
  });
  return rows;
}

export interface RankedOffer extends ShopOffer {
  total?: number;
  best: boolean;
}

/** Sorts by final price (price + shipping). Stores with errors go last. */
export function rankOffers(offers: ShopOffer[]): RankedOffer[] {
  const ok = offers
    .filter((s) => !s.error)
    .map((s) => ({ ...s, total: r2((s.price ?? 0) + (s.ship ?? 0)) }))
    .sort((a, b) => a.total - b.total);
  const failed = offers.filter((s) => s.error);
  // The cheapest one gets the "best" tag
  const ranked = ok.map((s, i) => ({ ...s, best: i === 0 }));
  return [...ranked, ...failed.map((s) => ({ ...s, best: false }))];
}
