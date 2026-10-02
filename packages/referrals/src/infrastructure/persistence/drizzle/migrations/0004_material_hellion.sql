CREATE TABLE "referrals"."campaign_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"action" varchar(16) NOT NULL,
	"actor" varchar(160) NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals"."campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"public_title" varchar(160) NOT NULL,
	"description" varchar(600) DEFAULT '' NOT NULL,
	"context" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"channel" varchar(100) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_period_check" CHECK ("referrals"."campaigns"."ends_at" > "referrals"."campaigns"."starts_at"),
	CONSTRAINT "campaigns_status_check" CHECK ("referrals"."campaigns"."status" in ('draft','active','paused','ended')),
	CONSTRAINT "campaigns_context_check" CHECK ("referrals"."campaigns"."context" in ('ad','event','other'))
);
--> statement-breakpoint
ALTER TABLE "referrals"."codes" DROP CONSTRAINT "codes_owner_check";--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "source_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "course_slug" varchar(100);--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "attribution" jsonb;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "welcome_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals"."campaign_history" ADD CONSTRAINT "campaign_history_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "referrals"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_history_campaign_idx" ON "referrals"."campaign_history" USING btree ("campaign_id","created_at");--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "referrals"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "codes_campaign_uq" ON "referrals"."codes" USING btree ("campaign_id") WHERE campaign_id is not null;--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_owner_check" CHECK ((owner_kind = 'ambassador' and ambassador_id is not null and account_user_id is null and campaign_id is null) or (owner_kind = 'account' and account_user_id is not null and ambassador_id is null and campaign_id is null) or (owner_kind = 'campaign' and campaign_id is not null and ambassador_id is null and account_user_id is null));