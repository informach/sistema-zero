CREATE TABLE "members"."account_deletion_fences" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."creation_cleanup_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
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
CREATE UNIQUE INDEX "creation_cleanup_jobs_account_uq" ON "members"."creation_cleanup_jobs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "creation_cleanup_jobs_due_idx" ON "members"."creation_cleanup_jobs" USING btree ("completed_at","not_before","locked_at");