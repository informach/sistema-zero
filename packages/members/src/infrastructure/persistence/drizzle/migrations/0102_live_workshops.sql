CREATE TABLE "members"."live_access_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "live_grants_interval_check" CHECK ("members"."live_access_grants"."ends_at" > "members"."live_access_grants"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "members"."live_audit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cohort_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_cohorts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cohort_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"learner_id" uuid,
	"status" text NOT NULL,
	"document" jsonb NOT NULL,
	CONSTRAINT "live_enrollments_status_check" CHECK ("members"."live_enrollments"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "members"."live_media_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"participation_id" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"state" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cohort_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_project_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cohort_id" uuid NOT NULL,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."live_workspace_revisions" (
	"workspace_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"project" jsonb NOT NULL,
	"writer_id" uuid NOT NULL,
	"mutation_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "live_workspace_revisions_workspace_id_revision_pk" PRIMARY KEY("workspace_id","revision")
);
--> statement-breakpoint
CREATE TABLE "members"."live_workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"writer_epoch" integer DEFAULT 0 NOT NULL,
	"writer_id" uuid NOT NULL,
	"writer_device_id" text,
	"lease_expires_at" timestamp with time zone,
	"project" jsonb NOT NULL,
	"assistance" jsonb,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."live_access_grants" ADD CONSTRAINT "live_access_grants_enrollment_id_live_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "members"."live_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_access_grants" ADD CONSTRAINT "live_access_grants_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_audit" ADD CONSTRAINT "live_audit_cohort_id_live_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "members"."live_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_cohorts" ADD CONSTRAINT "live_cohorts_program_id_live_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "members"."live_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_enrollments" ADD CONSTRAINT "live_enrollments_cohort_id_live_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "members"."live_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_media_connections" ADD CONSTRAINT "live_media_connections_occurrence_id_live_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "members"."live_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_occurrences" ADD CONSTRAINT "live_occurrences_cohort_id_live_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "members"."live_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_occurrences" ADD CONSTRAINT "live_occurrences_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_sessions" ADD CONSTRAINT "live_sessions_cohort_id_live_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "members"."live_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_workspace_revisions" ADD CONSTRAINT "live_workspace_revisions_workspace_id_live_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "members"."live_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_workspaces" ADD CONSTRAINT "live_workspaces_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_grants_enrollment_session_uq" ON "members"."live_access_grants" USING btree ("enrollment_id","session_id");--> statement-breakpoint
CREATE INDEX "live_grants_session_idx" ON "members"."live_access_grants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "live_audit_cohort_idx" ON "members"."live_audit" USING btree ("cohort_id","created_at");--> statement-breakpoint
CREATE INDEX "live_cohorts_program_idx" ON "members"."live_cohorts" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "live_enrollments_account_idx" ON "members"."live_enrollments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "live_enrollments_cohort_idx" ON "members"."live_enrollments" USING btree ("cohort_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_enrollments_active_learner_uq" ON "members"."live_enrollments" USING btree ("cohort_id","learner_id") WHERE "members"."live_enrollments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "live_media_occurrence_actor_idx" ON "members"."live_media_connections" USING btree ("occurrence_id","actor_id");--> statement-breakpoint
CREATE INDEX "live_occurrences_session_idx" ON "members"."live_occurrences" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "live_occurrences_cohort_idx" ON "members"."live_occurrences" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "live_sessions_cohort_idx" ON "members"."live_sessions" USING btree ("cohort_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_workspace_mutation_uq" ON "members"."live_workspace_revisions" USING btree ("workspace_id","mutation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_workspace_session_learner_uq" ON "members"."live_workspaces" USING btree ("session_id","learner_id");--> statement-breakpoint
CREATE INDEX "live_workspaces_account_idx" ON "members"."live_workspaces" USING btree ("account_id");