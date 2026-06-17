CREATE TYPE "auth"."profile_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "auth"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"whatsapp" text,
	"status" "auth"."profile_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "profiles_account_idx" ON "auth"."profiles" USING btree ("account_user_id","sort_order");