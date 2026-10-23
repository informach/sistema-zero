CREATE TABLE "members"."pensa_execution_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"project_key" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" varchar(64) NOT NULL,
	"data" jsonb NOT NULL,
	"reward" jsonb,
	"reward_status" varchar(16),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_mission_progress" (
	"mission_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"progress_revision" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'planned' NOT NULL,
	"validity" varchar(24) DEFAULT 'current' NOT NULL,
	"assignee_profile_id" uuid,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pensa_mission_progress_status_check" CHECK ("members"."pensa_mission_progress"."status" in ('planned', 'in_progress', 'completed')),
	CONSTRAINT "pensa_mission_progress_validity_check" CHECK ("members"."pensa_mission_progress"."validity" in ('current', 'needs_review'))
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_plan_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_project_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"context" varchar(24) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_project_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"previous_revision_id" uuid,
	"snapshot" jsonb NOT NULL,
	"accepted_by_profile_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."ai_usage_reservations" DROP CONSTRAINT "ai_usage_reservations_project_id_pensa_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" DROP CONSTRAINT "pensa_checkpoints_cycle_id_pensa_cycles_id_fk";
--> statement-breakpoint
ALTER TABLE "members"."pensa_operations" DROP CONSTRAINT "pensa_operations_cycle_id_pensa_cycles_id_fk";
--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" ADD COLUMN "project_revision_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" ADD COLUMN "snapshot" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_operations" ADD COLUMN "draft_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "active_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "revision_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "metadata_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "team_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "execution_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "game_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "game_account_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "game_creation_id" varchar(120);--> statement-breakpoint
ALTER TABLE "members"."pensa_execution_events" ADD CONSTRAINT "pensa_execution_events_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_mission_progress" ADD CONSTRAINT "pensa_mission_progress_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_plan_drafts" ADD CONSTRAINT "pensa_plan_drafts_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_project_messages" ADD CONSTRAINT "pensa_project_messages_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_project_revisions" ADD CONSTRAINT "pensa_project_revisions_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_execution_events_request_uq" ON "members"."pensa_execution_events" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_execution_events_milestone_uq" ON "members"."pensa_execution_events" USING btree ("project_key","kind") WHERE "members"."pensa_execution_events"."reward" is not null;--> statement-breakpoint
CREATE INDEX "pensa_execution_events_rewards_idx" ON "members"."pensa_execution_events" USING btree ("reward_status");--> statement-breakpoint
CREATE INDEX "pensa_mission_progress_project_idx" ON "members"."pensa_mission_progress" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_plan_drafts_active_uq" ON "members"."pensa_plan_drafts" USING btree ("project_id") WHERE "members"."pensa_plan_drafts"."status" in ('collecting', 'needs_choice', 'ready');--> statement-breakpoint
CREATE INDEX "pensa_project_messages_project_idx" ON "members"."pensa_project_messages" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_project_revisions_number_uq" ON "members"."pensa_project_revisions" USING btree ("project_id","number");--> statement-breakpoint
ALTER TABLE "members"."ai_usage_reservations" ADD CONSTRAINT "ai_usage_reservations_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pensa_operations_lease_idx" ON "members"."pensa_operations" USING btree ("status","lease_until");--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" DROP COLUMN "cycle_id";--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" DROP COLUMN "journey";--> statement-breakpoint
ALTER TABLE "members"."pensa_operations" DROP COLUMN "cycle_id";