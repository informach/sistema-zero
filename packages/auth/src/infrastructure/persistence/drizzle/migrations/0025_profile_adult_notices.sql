CREATE TABLE "auth"."profile_adult_notices" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"account_user_id" uuid NOT NULL,
	"turned_adult_on" date NOT NULL,
	"notified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."profile_adult_notices" ADD CONSTRAINT "profile_adult_notices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."profiles"("id") ON DELETE cascade ON UPDATE no action;