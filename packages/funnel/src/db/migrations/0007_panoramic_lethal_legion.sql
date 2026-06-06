DROP INDEX "funil"."funnel_events_name_idx";--> statement-breakpoint
ALTER TABLE "funil"."lead_payments" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "welcome_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "members_granted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "funnel_events_name_lead_idx" ON "funil"."funnel_events" USING btree ("event_name","lead_id");