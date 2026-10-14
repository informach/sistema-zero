CREATE TABLE "members"."private_narrations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"chars" integer NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) NOT NULL,
	"lease_id" uuid NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "private_narrations_account_date_idx" ON "members"."private_narrations" USING btree ("account_id","created_at");