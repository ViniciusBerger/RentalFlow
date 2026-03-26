ALTER TABLE "rentals" DROP CONSTRAINT "rentals_user_id_users_firebase_uid_fk";
--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE cascade ON UPDATE no action;