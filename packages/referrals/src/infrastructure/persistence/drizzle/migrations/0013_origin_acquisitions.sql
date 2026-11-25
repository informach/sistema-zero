CREATE TABLE "referrals"."acquisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"account_user_id" uuid,
	"audience" varchar(16) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"offer_id" uuid,
	"offer_slug" varchar(80),
	"amount_cents" bigint DEFAULT 0 NOT NULL,
	"payment_id" text,
	"subscription_id" text,
	"redemption_id" uuid,
	"origin_kind" varchar(16) NOT NULL,
	"code_id" uuid,
	"campaign_id" uuid,
	"ambassador_id" uuid,
	"place" varchar(48),
	"utm" jsonb,
	"bonus_terms" jsonb,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acquisitions_audience_check" CHECK ("referrals"."acquisitions"."audience" in ('kids','adult')),
	CONSTRAINT "acquisitions_kind_check" CHECK ("referrals"."acquisitions"."kind" in ('gift','one_time','subscription')),
	CONSTRAINT "acquisitions_origin_check" CHECK ("referrals"."acquisitions"."origin_kind" in ('ambassador','campaign','platform','ads','none')),
	CONSTRAINT "acquisitions_status_check" CHECK ("referrals"."acquisitions"."status" in ('active','refunded')),
	CONSTRAINT "acquisitions_source_check" CHECK (("referrals"."acquisitions"."kind" = 'gift' and "referrals"."acquisitions"."redemption_id" is not null) or ("referrals"."acquisitions"."kind" <> 'gift' and "referrals"."acquisitions"."payment_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "referrals"."ambassador_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" varchar(16) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"offer_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambassador_offers_audience_check" CHECK ("referrals"."ambassador_offers"."audience" in ('kids','adult')),
	CONSTRAINT "ambassador_offers_kind_check" CHECK ("referrals"."ambassador_offers"."kind" in ('gift','referral'))
);
--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ALTER COLUMN "redemption_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "kind" varchar(8) DEFAULT 'gift' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "sale_offer_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "link_target" varchar(16) DEFAULT 'page' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "redirect_path" varchar(120);--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "redirect_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD COLUMN "acquisition_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD COLUMN "subscriber_email" text;--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD COLUMN "audience" varchar(16);--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" ADD CONSTRAINT "acquisitions_redemption_id_scholarship_redemptions_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "referrals"."scholarship_redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" ADD CONSTRAINT "acquisitions_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "referrals"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" ADD CONSTRAINT "acquisitions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "referrals"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."acquisitions" ADD CONSTRAINT "acquisitions_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "referrals"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "acquisitions_payment_uq" ON "referrals"."acquisitions" USING btree ("payment_id") WHERE payment_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "acquisitions_redemption_uq" ON "referrals"."acquisitions" USING btree ("redemption_id") WHERE redemption_id is not null;--> statement-breakpoint
CREATE INDEX "acquisitions_email_audience_idx" ON "referrals"."acquisitions" USING btree ("email","audience","acquired_at");--> statement-breakpoint
CREATE INDEX "acquisitions_account_idx" ON "referrals"."acquisitions" USING btree ("account_user_id") WHERE account_user_id is not null;--> statement-breakpoint
CREATE INDEX "acquisitions_campaign_idx" ON "referrals"."acquisitions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "acquisitions_ambassador_idx" ON "referrals"."acquisitions" USING btree ("ambassador_id");--> statement-breakpoint
CREATE INDEX "acquisitions_acquired_idx" ON "referrals"."acquisitions" USING btree ("acquired_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ambassador_offers_offer_uq" ON "referrals"."ambassador_offers" USING btree ("audience","kind","offer_id");--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD CONSTRAINT "conversions_acquisition_id_acquisitions_id_fk" FOREIGN KEY ("acquisition_id") REFERENCES "referrals"."acquisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_redirect_path_uq" ON "referrals"."campaigns" USING btree ("redirect_path") WHERE redirect_path is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversions_subscriber_uq" ON "referrals"."conversions" USING btree ("subscriber_email","audience") WHERE subscriber_email is not null and status not in ('canceled', 'superseded');--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_kind_check" CHECK ("referrals"."campaigns"."kind" in ('gift','sale'));--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_link_target_check" CHECK ("referrals"."campaigns"."link_target" in ('page','checkout'));--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_kind_offer_check" CHECK (("referrals"."campaigns"."kind" = 'gift' and "referrals"."campaigns"."sale_offer_id" is null) or ("referrals"."campaigns"."kind" = 'sale' and "referrals"."campaigns"."sale_offer_id" is not null and "referrals"."campaigns"."gift_offer_id" is null));--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_redirect_check" CHECK (("referrals"."campaigns"."redirect_path" is null) = ("referrals"."campaigns"."redirect_until" is null));