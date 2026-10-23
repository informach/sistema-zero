CREATE TABLE "members"."pensa_deletion_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"prefixes" jsonb NOT NULL,
	"not_before" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."private_narrations" ADD COLUMN "project_id" uuid;--> statement-breakpoint
CREATE INDEX "pensa_deletion_jobs_due_idx" ON "members"."pensa_deletion_jobs" USING btree ("completed_at","not_before");