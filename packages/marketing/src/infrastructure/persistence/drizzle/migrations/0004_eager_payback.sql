ALTER TABLE "marketing"."publications" ADD COLUMN "metrics_next_collect_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "publications_metrics_due_idx" ON "marketing"."publications" USING btree ("metrics_next_collect_at") WHERE "marketing"."publications"."status" = 'published' and "marketing"."publications"."external_post_id" is not null;--> statement-breakpoint
-- Backfill: publicadas com post externo entram no radar de coleta já (o
-- decaimento reagenda a partir da primeira coleta do metrics-worker).
UPDATE "marketing"."publications" SET "metrics_next_collect_at" = now() WHERE "status" = 'published' AND "external_post_id" IS NOT NULL;
