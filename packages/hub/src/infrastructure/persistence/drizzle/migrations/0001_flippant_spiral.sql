ALTER TABLE "hub"."spaces" ADD COLUMN "teaser_when_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN "is_showcase" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN "author_display_name" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN "showcase_idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "threads_showcase_key_uq" ON "hub"."threads" USING btree ("showcase_idempotency_key");