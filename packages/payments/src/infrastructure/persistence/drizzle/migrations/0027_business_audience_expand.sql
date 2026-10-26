ALTER TABLE "payments"."payments" ADD COLUMN "reporting_audience" text;--> statement-breakpoint
ALTER TABLE "payments"."subscriptions" ADD COLUMN "reporting_audience" text;--> statement-breakpoint
CREATE INDEX "payments_reporting_audience_created_idx" ON "payments"."payments" USING btree ("reporting_audience","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_reporting_audience_created_idx" ON "payments"."subscriptions" USING btree ("reporting_audience","created_at");--> statement-breakpoint
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_reporting_audience_check" CHECK ("payments"."payments"."reporting_audience" in ('kids', 'adult'));--> statement-breakpoint
ALTER TABLE "payments"."subscriptions" ADD CONSTRAINT "subscriptions_reporting_audience_check" CHECK ("payments"."subscriptions"."reporting_audience" in ('kids', 'adult'));