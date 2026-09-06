CREATE TABLE "referrals"."conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redemption_id" uuid NOT NULL,
	"code_id" uuid NOT NULL,
	"ambassador_id" uuid,
	"payment_id" text NOT NULL,
	"subscription_id" text,
	"offer_slug" varchar(80) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"bonus_cents" integer NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"matures_at" timestamp with time zone NOT NULL,
	"eligible_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"paid_marked_at" timestamp with time zone,
	"paid_marked_by" varchar(120),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals"."processed_webhooks" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"payment_id" text,
	"event_name" text,
	"processed_at" timestamp with time zone,
	"processing_at" timestamp with time zone,
	"processing_token" text
);
--> statement-breakpoint
ALTER TABLE "referrals"."ambassadors" ADD COLUMN "account_user_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."ambassadors" ADD COLUMN "pix_key" varchar(140);--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD CONSTRAINT "conversions_redemption_id_scholarship_redemptions_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "referrals"."scholarship_redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD CONSTRAINT "conversions_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "referrals"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals"."conversions" ADD CONSTRAINT "conversions_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "referrals"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversions_redemption_uq" ON "referrals"."conversions" USING btree ("redemption_id") WHERE status <> 'canceled';--> statement-breakpoint
CREATE UNIQUE INDEX "conversions_payment_uq" ON "referrals"."conversions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "conversions_status_matures_idx" ON "referrals"."conversions" USING btree ("status","matures_at");--> statement-breakpoint
CREATE INDEX "conversions_ambassador_status_idx" ON "referrals"."conversions" USING btree ("ambassador_id","status");--> statement-breakpoint
CREATE INDEX "conversions_code_idx" ON "referrals"."conversions" USING btree ("code_id");--> statement-breakpoint
CREATE INDEX "referrals_pw_processed_at_idx" ON "referrals"."processed_webhooks" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "referrals_pw_processing_at_idx" ON "referrals"."processed_webhooks" USING btree ("processing_at") WHERE processed_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ambassadors_account_uq" ON "referrals"."ambassadors" USING btree ("account_user_id") WHERE account_user_id is not null;