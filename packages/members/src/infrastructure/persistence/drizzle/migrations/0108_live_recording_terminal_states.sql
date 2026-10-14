CREATE TABLE IF NOT EXISTS "members"."live_media_reconcile_leases" (
	"occurrence_id" uuid PRIMARY KEY NOT NULL,
	"holder" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "recording_lease_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "finished_at" timestamp with time zone;