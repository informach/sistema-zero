CREATE TABLE "referrals"."course_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"audience" varchar(16) NOT NULL,
	"course_slug" varchar(140) NOT NULL,
	"gift_offer_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"legacy_campaign" jsonb,
	"legacy_history" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_benefits_audience_check" CHECK ("referrals"."course_benefits"."audience" in ('kids','adult')),
	CONSTRAINT "course_benefits_status_check" CHECK ("referrals"."course_benefits"."status" in ('active','disabled'))
);
--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" DROP CONSTRAINT "acquisitions_origin_check";--> statement-breakpoint
ALTER TABLE "referrals"."codes" DROP CONSTRAINT "codes_owner_check";--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD COLUMN "benefit_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "benefit_context" jsonb;--> statement-breakpoint
CREATE INDEX "course_benefits_course_idx" ON "referrals"."course_benefits" USING btree ("audience","course_slug");--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_benefit_id_course_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "referrals"."course_benefits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "codes_benefit_uq" ON "referrals"."codes" USING btree ("benefit_id") WHERE benefit_id is not null;--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" ADD CONSTRAINT "acquisitions_origin_check" CHECK ("referrals"."acquisitions"."origin_kind" in ('ambassador','campaign','platform','course','ads','none'));--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_owner_check" CHECK ((owner_kind = 'ambassador' and ambassador_id is not null and account_user_id is null and campaign_id is null and benefit_id is null) or (owner_kind = 'account' and account_user_id is not null and ambassador_id is null and campaign_id is null and benefit_id is null) or (owner_kind = 'campaign' and campaign_id is not null and ambassador_id is null and account_user_id is null and benefit_id is null) or (owner_kind = 'benefit' and benefit_id is not null and ambassador_id is null and account_user_id is null and campaign_id is null));