CREATE TABLE "hub"."studio_publication_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"event" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "studio_events_pending_idx" ON "hub"."studio_publication_events" USING btree ("next_attempt_at") WHERE "hub"."studio_publication_events"."delivered_at" is null;