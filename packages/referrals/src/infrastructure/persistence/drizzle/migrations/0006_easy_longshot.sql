ALTER TABLE "referrals"."campaigns" ADD COLUMN "ambassador_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "commission_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "commission_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD COLUMN "commission_window_days" integer;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "campaign_referral" jsonb;--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "referrals"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_ambassador_idx" ON "referrals"."campaigns" USING btree ("ambassador_id");--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_commission_check" CHECK ((
      "referrals"."campaigns"."commission_enabled" = false and "referrals"."campaigns"."commission_amount_cents" is null and "referrals"."campaigns"."commission_window_days" is null
    ) or (
      "referrals"."campaigns"."commission_enabled" = true and "referrals"."campaigns"."ambassador_id" is not null
      and "referrals"."campaigns"."commission_amount_cents" is not null and "referrals"."campaigns"."commission_amount_cents" between 1 and 100000000
      and "referrals"."campaigns"."commission_window_days" is not null and "referrals"."campaigns"."commission_window_days" between 1 and 3650
    ));