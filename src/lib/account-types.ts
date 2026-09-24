// Datos de una cuenta real tal y como llegan al cliente.
import type { Product } from "./demo-data";

export type Freq = "15m" | "1h" | "6h" | "24h";

export interface AccountUser {
  name: string;
  email: string;
  image: string | null;
}

export interface AccountAlert {
  id: number;
  productId: string;
  name: string;
  txt: string;
  date: string;
  time: string;
  channels: string;
}

export interface AccountSettings {
  email: boolean;
  telegram: boolean;
  freq: Freq;
}

export interface AccountData {
  user: AccountUser;
  products: Product[];
  alerts: Record<string, boolean>;
  history: AccountAlert[];
  settings: AccountSettings;
  /** Minutos desde la última revisión de precios (null si nunca) */
  lastCheckMinutes: number | null;
}

/** Resultado de una acción del servidor. */
export type ActionResult<T = AccountData> = { ok: true; data: T } | { ok: false; error: string };

/** Máximo de productos por cuenta en el plan gratuito */
export const PRODUCT_LIMIT = 25;
