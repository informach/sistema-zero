ALTER TABLE "auth"."profiles" ADD COLUMN "public_nickname" text;--> statement-breakpoint
ALTER TABLE "auth"."profiles" ADD COLUMN "identity_confirmed_at" timestamp with time zone;