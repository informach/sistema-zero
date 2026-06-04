CREATE TYPE "auth"."otp_purpose" AS ENUM('sign_in', 'password_reset');--> statement-breakpoint
CREATE TABLE "auth"."otp_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth"."otp_purpose" NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_codes_user_purpose_idx" ON "auth"."otp_codes" USING btree ("user_id","purpose");