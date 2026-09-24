// Data for a real account, as sent to the client
import type { Product, ProductList } from "./demo-data";

export type Freq = "15m" | "1h" | "6h" | "24h";

export interface AccountUser {
  name: string;
  email: string;
  image: string | null;
  // How the user signs in: with Google or with email and password
  provider: "google" | "email";
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
  lists: ProductList[];
  alerts: Record<string, boolean>;
  history: AccountAlert[];
  settings: AccountSettings;
  // Minutes since the last price check (null if never)
  lastCheckMinutes: number | null;
}

// What every server action returns
export type ActionResult<T = AccountData> = { ok: true; data: T } | { ok: false; error: string };

// Max products per account on the free plan
export const PRODUCT_LIMIT = 25;

// Max lists per account
export const LIST_LIMIT = 20;
