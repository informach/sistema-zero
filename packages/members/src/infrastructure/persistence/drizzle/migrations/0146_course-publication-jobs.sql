CREATE TABLE "members"."course_publication_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_key" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"status" text DEFAULT 'preview' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_hash" varchar(64) NOT NULL,
	"plan_hash" varchar(64) NOT NULL,
	"preview" jsonb NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"error" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_publication_operation" CHECK ("members"."course_publication_jobs"."operation" in ('copy-adult','promote-kids')),
	CONSTRAINT "course_publication_status" CHECK ("members"."course_publication_jobs"."status" in ('preview','queued','preparing','publishing','completed','failed','cancelled')),
	CONSTRAINT "course_publication_lease" CHECK (("members"."course_publication_jobs"."lease_token" is null) = ("members"."course_publication_jobs"."lease_until" is null)),
	CONSTRAINT "course_publication_payload_bound" CHECK (octet_length("members"."course_publication_jobs"."snapshot"::text) <= 64000000 and "members"."course_publication_jobs"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "members"."course_publication_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"task_key" varchar(128) NOT NULL,
	"kind" text NOT NULL,
	"input" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_publication_task_kind" CHECK ("members"."course_publication_tasks"."kind" in ('media-plan','voice','video','r2-copy','vimeo-copy')),
	CONSTRAINT "course_publication_task_status" CHECK ("members"."course_publication_tasks"."status" in ('pending','completed','failed')),
	CONSTRAINT "course_publication_task_payload_bound" CHECK (octet_length("members"."course_publication_tasks"."input"::text) <= 2000000 and ("members"."course_publication_tasks"."result" is null or octet_length("members"."course_publication_tasks"."result"::text) <= 2000000))
);
--> statement-breakpoint
ALTER TABLE "members"."course_publication_tasks" ADD CONSTRAINT "course_publication_tasks_job_id_course_publication_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "members"."course_publication_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_publication_request_uq" ON "members"."course_publication_jobs" USING btree ("actor_id","request_key");--> statement-breakpoint
CREATE INDEX "course_publication_queue_idx" ON "members"."course_publication_jobs" USING btree ("status","lease_until","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "course_publication_task_uq" ON "members"."course_publication_tasks" USING btree ("job_id","task_key");--> statement-breakpoint
CREATE INDEX "course_publication_task_queue_idx" ON "members"."course_publication_tasks" USING btree ("job_id","status","created_at");