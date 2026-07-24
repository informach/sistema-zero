ALTER TABLE "fiscal"."processed_webhooks" ALTER COLUMN "processed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "fiscal"."processed_webhooks" ALTER COLUMN "processed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fiscal"."processed_webhooks" ADD COLUMN "processing_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "processed_webhooks_processing_at_idx" ON "fiscal"."processed_webhooks" USING btree ("processing_at") WHERE processed_at IS NULL;