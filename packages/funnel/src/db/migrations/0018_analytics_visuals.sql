CREATE TABLE "funil"."analytics_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"page" text NOT NULL,
	"revision" text NOT NULL,
	"viewport" integer NOT NULL,
	"height" integer NOT NULL,
	"image" text NOT NULL,
	"elements" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funil"."analytics_events" ADD COLUMN "viewport" integer;--> statement-breakpoint
ALTER TABLE "funil"."analytics_events" ADD COLUMN "x" integer;--> statement-breakpoint
ALTER TABLE "funil"."analytics_events" ADD COLUMN "y" integer;--> statement-breakpoint
CREATE INDEX "analytics_snapshot_page_idx" ON "funil"."analytics_snapshots" USING btree ("page","revision","viewport");