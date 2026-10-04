ALTER TABLE "funil"."leads" ADD COLUMN "paid_payment_id" uuid;--> statement-breakpoint
CREATE INDEX "analytics_lead_links_session_idx" ON "funil"."analytics_lead_links" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "lead_payments_lead_idx" ON "funil"."lead_payments" USING btree ("lead_id");