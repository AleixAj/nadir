CREATE TABLE "catalog_offer" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"store" text NOT NULL,
	"price_cents" integer NOT NULL,
	"url" text NOT NULL,
	"shipping" text
);
--> statement-breakpoint
CREATE TABLE "catalog_product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"list" text NOT NULL,
	"image" text,
	"search_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "catalog_id" text;--> statement-breakpoint
ALTER TABLE "catalog_offer" ADD CONSTRAINT "catalog_offer_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_offer_product_idx" ON "catalog_offer" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_offer_product_store_idx" ON "catalog_offer" USING btree ("product_id","store");--> statement-breakpoint
CREATE INDEX "catalog_product_category_idx" ON "catalog_product" USING btree ("category");