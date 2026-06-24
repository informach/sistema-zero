ALTER TABLE "funil"."leads" ADD COLUMN "funnel" text;--> statement-breakpoint
CREATE INDEX "leads_funnel_idx" ON "funil"."leads" USING btree ("funnel");