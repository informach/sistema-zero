ALTER TABLE "funil"."lead_payments" ADD COLUMN "access_period_months" integer;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "subscription_interval_months" integer;--> statement-breakpoint
CREATE INDEX "leads_subscription_idx" ON "funil"."leads" USING btree ("subscription_id");