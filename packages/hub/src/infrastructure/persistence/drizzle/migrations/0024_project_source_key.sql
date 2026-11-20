ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "showcase_source_key" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "game_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "threads_showcase_source_uq" ON "hub"."threads" USING btree ("showcase_source_key") WHERE "hub"."threads"."showcase_source_key" is not null;
