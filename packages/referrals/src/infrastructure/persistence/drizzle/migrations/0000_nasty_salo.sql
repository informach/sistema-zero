CREATE SCHEMA "referrals";
--> statement-breakpoint
CREATE TABLE "referrals"."ambassadors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" text NOT NULL,
	"page_token" text NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"link_email_count" integer DEFAULT 0 NOT NULL,
	"link_email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals"."codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"owner_kind" varchar(16) NOT NULL,
	"ambassador_id" uuid,
	"account_user_id" uuid,
	"display_name" varchar(120) NOT NULL,
	"owner_email" text,
	"owner_document" text,
	"panel_audience" varchar(16),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codes_owner_check" CHECK ((owner_kind = 'ambassador' and ambassador_id is not null and account_user_id is null) or (owner_kind = 'account' and account_user_id is not null and ambassador_id is null))
);
--> statement-breakpoint
CREATE TABLE "referrals"."invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ambassador_id" uuid NOT NULL,
	"code_id" uuid NOT NULL,
	"invitee_name" varchar(120) NOT NULL,
	"invitee_email" text NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"send_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals"."scholarship_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(20),
	"user_id" uuid,
	"buyer_created" boolean,
	"granted_at" timestamp with time zone,
	"welcome_sent_at" timestamp with time zone,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"failed_reason" varchar(64),
	"last_error" text,
	"processing_until" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "referrals"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."invites" ADD CONSTRAINT "invites_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "referrals"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."invites" ADD CONSTRAINT "invites_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "referrals"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD CONSTRAINT "scholarship_redemptions_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "referrals"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ambassadors_email_uq" ON "referrals"."ambassadors" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ambassadors_page_token_uq" ON "referrals"."ambassadors" USING btree ("page_token");--> statement-breakpoint
CREATE UNIQUE INDEX "codes_code_uq" ON "referrals"."codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "codes_ambassador_uq" ON "referrals"."codes" USING btree ("ambassador_id") WHERE ambassador_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "codes_account_uq" ON "referrals"."codes" USING btree ("account_user_id") WHERE account_user_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "invites_ambassador_invitee_uq" ON "referrals"."invites" USING btree ("ambassador_id","invitee_email");--> statement-breakpoint
CREATE INDEX "invites_ambassador_created_idx" ON "referrals"."invites" USING btree ("ambassador_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scholarship_redemptions_email_uq" ON "referrals"."scholarship_redemptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "scholarship_redemptions_code_status_idx" ON "referrals"."scholarship_redemptions" USING btree ("code_id","status");