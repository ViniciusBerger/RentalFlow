-- Run with drizzle-kit migrate BEFORE deploying the new application.
-- One primary property for each existing account, regardless of whether it has bookings.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "properties" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "user_id" varchar(128) NOT NULL REFERENCES "users"("firebase_uid") ON DELETE CASCADE,
 "name" varchar(120) NOT NULL,
 "address" varchar(300),
 "color" varchar(7) NOT NULL DEFAULT '#0D8A57',
 "icon" varchar(30) NOT NULL DEFAULT 'building',
 "is_active" boolean NOT NULL DEFAULT true,
 "is_default" boolean NOT NULL DEFAULT false,
 "created_at" timestamp NOT NULL DEFAULT now(),
 CONSTRAINT "properties_id_owner_unique" UNIQUE("id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_owner_idx" ON "properties"("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "properties_one_default_per_owner" ON "properties"("user_id") WHERE "is_default";
--> statement-breakpoint
INSERT INTO "properties" ("user_id","name","is_default")
SELECT "firebase_uid", 'Imóvel principal', true FROM "users"
ON CONFLICT ("user_id") WHERE "is_default" DO NOTHING;
--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "property_id" uuid;
--> statement-breakpoint
UPDATE "rentals" AS r SET "property_id" = p."id" FROM "properties" p
WHERE p."user_id" = r."user_id" AND p."is_default" AND r."property_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "rentals" ALTER COLUMN "property_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_property_owner_fk"
 FOREIGN KEY ("property_id","user_id") REFERENCES "properties"("id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_property_idx" ON "rentals"("property_id");
--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rental_valid_dates" CHECK ("end_date" > "start_date");
--> statement-breakpoint
-- Prevent concurrent double-booking while permitting different properties on the same dates.
-- If legacy data already contains overlapping active bookings, this deliberately fails atomically;
--> statement-breakpoint
-- resolve conflicts before proceeding rather than silently discarding reservations.
ALTER TABLE "rentals" ADD CONSTRAINT "rental_no_active_property_overlap"
 EXCLUDE USING gist ("property_id" WITH =, daterange("start_date","end_date",'[)') WITH &&)
 WHERE ("is_active" = true);
--> statement-breakpoint
