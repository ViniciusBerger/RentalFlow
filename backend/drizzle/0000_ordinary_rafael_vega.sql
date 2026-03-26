CREATE TYPE "public"."user_role" AS ENUM('staff', 'admin', 'host');--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"number_of_guests" integer NOT NULL,
	"total_revenue" double precision NOT NULL,
	"profit" double precision NOT NULL,
	"fee" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "rentals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"firebase_uid" varchar(128) PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'host' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "start_date_idx" ON "rentals" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "user_id_index" ON "rentals" USING btree ("user_id");