CREATE TABLE "members"."live_recording_jobs" (
	"occurrence_id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"desired_state" text NOT NULL,
	"confirmed_state" text DEFAULT 'not_started' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"lease_ends_at" timestamp with time zone NOT NULL,
	"manifest_key" text,
	"replay_key" text,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD CONSTRAINT "live_recording_jobs_occurrence_id_live_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "members"."live_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_recording_job_uq" ON "members"."live_recording_jobs" USING btree ("job_id");