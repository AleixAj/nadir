CREATE TABLE "user_list" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "list_id" text;--> statement-breakpoint
ALTER TABLE "user_list" ADD CONSTRAINT "user_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_list_name_idx" ON "user_list" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_list_id_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_list"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Give every existing user the two default lists
INSERT INTO "user_list" ("id", "user_id", "name", "color")
SELECT gen_random_uuid()::text, u."id", l."name", l."color"
FROM "user" u
CROSS JOIN (VALUES ('Tecnología', '#2563eb'), ('Hogar', '#0d9488')) AS l("name", "color");--> statement-breakpoint
-- Move each product to the new list with the same name
UPDATE "product" p SET "list_id" = l."id"
FROM "user_list" l
WHERE l."user_id" = p."user_id" AND l."name" = p."list";
