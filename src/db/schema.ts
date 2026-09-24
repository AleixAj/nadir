// Database schema (Postgres on Neon, using Drizzle ORM).
// The first four tables are the ones Better Auth needs for login.
// Prices are stored in cents (integers) to avoid floating point errors.
import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Login tables (Better Auth)

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// App tables

// A product a user follows, in one store (the one from its URL)
export const product = pgTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    store: text("store").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    list: text("list").notNull().default("Tecnología"),
    currency: text("currency").notNull().default("EUR"),
    targetCents: integer("target_cents"),
    alertOn: boolean("alert_on").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at"),
    // Last error when checking the price (null if it worked)
    lastError: text("last_error"),
    // Set for sample catalog products. Their price is simulated, not read from the store
    catalogId: text("catalog_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("product_user_idx").on(t.userId), uniqueIndex("product_user_url_idx").on(t.userId, t.url)],
);

// Every price read during a check. The history and chart come from here
export const pricePoint = pgTable(
  "price_point",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (t) => [index("price_point_product_idx").on(t.productId, t.checkedAt)],
);

// Alert created when a price drops below the target
export const alertEvent = pgTable(
  "alert_event",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    targetCents: integer("target_cents").notNull(),
    // Channels it was sent through (empty until emails are added)
    channels: text("channels").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("alert_event_product_idx").on(t.productId)],
);

// User preferences
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailAlerts: boolean("email_alerts").notNull().default(true),
  telegramAlerts: boolean("telegram_alerts").notNull().default(false),
  // How often their products get checked: 1h, 6h or 24h
  freq: text("freq").notNull().default("24h"),
});

// Sample catalog
// Real products loaded once from Google Shopping (scripts/seed-catalog.mjs).
// They stand in for what the stores' affiliate feeds would give us in production.

// A catalog product (the same model can be sold in several stores)
export const catalogProduct = pgTable(
  "catalog_product",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    // Category of the search that found it, like "Móviles" or "Auriculares"
    category: text("category").notNull(),
    // Nadir list it belongs to: Tecnología or Hogar
    list: text("list").notNull(),
    image: text("image"),
    // Lowercase text without accents, used for search
    searchText: text("search_text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("catalog_product_category_idx").on(t.category)],
);

// Price of a catalog product in one store
export const catalogOffer = pgTable(
  "catalog_offer",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    store: text("store").notNull(),
    priceCents: integer("price_cents").notNull(),
    url: text("url").notNull(),
    shipping: text("shipping"),
    // Shipping cost in cents (0 if free, null if unknown)
    shippingCents: integer("shipping_cents"),
  },
  (t) => [index("catalog_offer_product_idx").on(t.productId), uniqueIndex("catalog_offer_product_store_idx").on(t.productId, t.store)],
);
