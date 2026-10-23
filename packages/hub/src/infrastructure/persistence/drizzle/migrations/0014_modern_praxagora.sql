CREATE TABLE "hub"."studio_artifact_cleanups" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"play_id" text NOT NULL,
	"cover_url" text,
	"audience" "hub"."audience" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "studio_artifact_cleanups_pending_idx" ON "hub"."studio_artifact_cleanups" USING btree ("audience","next_attempt_at") WHERE "hub"."studio_artifact_cleanups"."delivered_at" is null;