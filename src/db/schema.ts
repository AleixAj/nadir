// Esquema de la base de datos (Postgres en Neon, con Drizzle ORM).
// Las cuatro primeras tablas son las que necesita Better Auth para el login.
// Los importes se guardan en céntimos (enteros) para no arrastrar errores de coma flotante.
import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/* ─── Login (Better Auth) ───────────────────────────────────── */

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

/* ─── Nadir ─────────────────────────────────────────────────── */

/** Un producto que sigue un usuario, en una tienda concreta (la de su URL). */
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
    /** Último error al revisar el precio (null si fue bien) */
    lastError: text("last_error"),
    /** Si viene del catálogo de prueba: su id (el precio se simula, no se lee de la tienda) */
    catalogId: text("catalog_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("product_user_idx").on(t.userId), uniqueIndex("product_user_url_idx").on(t.userId, t.url)],
);

/** Cada precio leído en una revisión. De aquí sale el histórico y la gráfica. */
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

/** Aviso generado cuando un precio baja del objetivo. */
export const alertEvent = pgTable(
  "alert_event",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    targetCents: integer("target_cents").notNull(),
    /** Canales por los que se ha enviado (vacío hasta que haya emails) */
    channels: text("channels").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("alert_event_product_idx").on(t.productId)],
);

/** Preferencias de cada usuario. */
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailAlerts: boolean("email_alerts").notNull().default(true),
  telegramAlerts: boolean("telegram_alerts").notNull().default(false),
  /** Cada cuánto se revisan sus productos: 1h, 6h o 24h */
  freq: text("freq").notNull().default("24h"),
});

/* ─── Catálogo de prueba ────────────────────────────────────── */
// Productos reales cargados una vez desde Google Shopping (scripts/seed-catalog.mjs).
// Simulan lo que en producción vendría de los catálogos de afiliados de cada tienda.

/** Un producto del catálogo (el mismo modelo puede venderse en varias tiendas). */
export const catalogProduct = pgTable(
  "catalog_product",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Categoría de la búsqueda que lo trajo: "Móviles", "Auriculares"… */
    category: text("category").notNull(),
    /** Lista de Nadir a la que pertenece: Tecnología u Hogar */
    list: text("list").notNull(),
    image: text("image"),
    /** Texto normalizado (minúsculas, sin tildes) para buscar rápido */
    searchText: text("search_text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("catalog_product_category_idx").on(t.category)],
);

/** Precio de un producto del catálogo en una tienda. */
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
  },
  (t) => [index("catalog_offer_product_idx").on(t.productId), uniqueIndex("catalog_offer_product_store_idx").on(t.productId, t.store)],
);
