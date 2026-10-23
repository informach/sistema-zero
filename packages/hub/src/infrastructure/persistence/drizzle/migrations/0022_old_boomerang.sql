CREATE TABLE "hub"."studio_reservation_cleanups" (
	"reservation_id" uuid PRIMARY KEY NOT NULL,
	"play_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "hub"."audience" NOT NULL,
	"snapshot_hash" text NOT NULL,
	"context" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "studio_reservation_cleanups_pending_idx" ON "hub"."studio_reservation_cleanups" USING btree ("audience","next_attempt_at") WHERE "hub"."studio_reservation_cleanups"."delivered_at" is null;