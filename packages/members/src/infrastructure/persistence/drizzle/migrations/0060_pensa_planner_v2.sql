-- Troca coordenada e deliberadamente destrutiva do Pensa. Não há conversão:
-- todo plano antigo é apagado por cascata; projetos autônomos do Estúdio e
-- desenhos do Pinta vivem em outros armazenamentos e não são tocados.
DROP TABLE IF EXISTS "members"."pensa_checklist_items" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members"."pensa_tasks" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members"."pensa_artifacts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members"."pensa_conversations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members"."pensa_cycles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members"."pensa_projects" CASCADE;--> statement-breakpoint

DROP TYPE IF EXISTS "members"."pensa_checklist_category";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_task_column";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_task_category";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_task_status";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_task_destination";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_artifact_status";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_artifact_type";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_project_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_project_status";--> statement-breakpoint
DROP TYPE IF EXISTS "members"."pensa_stage";--> statement-breakpoint

CREATE TYPE "members"."pensa_project_kind" AS ENUM('game');--> statement-breakpoint
CREATE TYPE "members"."pensa_project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "members"."pensa_stage" AS ENUM('z', 'e', 'r', 'o', 'done');--> statement-breakpoint
CREATE TYPE "members"."pensa_artifact_type" AS ENUM('idea', 'game_design', 'visual_direction', 'task_plan', 'plan_review');--> statement-breakpoint
CREATE TYPE "members"."pensa_artifact_status" AS ENUM('draft', 'validated');--> statement-breakpoint
CREATE TYPE "members"."pensa_task_destination" AS ENUM('pinta', 'studio');--> statement-breakpoint
CREATE TYPE "members"."pensa_task_status" AS ENUM('planned', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "members"."pensa_task_category" AS ENUM('art', 'setup', 'gameplay', 'scene', 'ui', 'polish');--> statement-breakpoint

CREATE TABLE "members"."pensa_projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"kind" "members"."pensa_project_kind" NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "members"."pensa_project_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "members"."pensa_cycles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"goal" text,
	"stage" "members"."pensa_stage" DEFAULT 'z' NOT NULL,
	"z_completed_at" timestamp with time zone,
	"e_completed_at" timestamp with time zone,
	"r_completed_at" timestamp with time zone,
	"o_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "members"."pensa_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"stage" "members"."pensa_stage" NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "members"."pensa_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"stage" "members"."pensa_stage" NOT NULL,
	"type" "members"."pensa_artifact_type" NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"status" "members"."pensa_artifact_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "members"."pensa_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text,
	"destination" "members"."pensa_task_destination" NOT NULL,
	"category" "members"."pensa_task_category" NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"position" integer NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guide" jsonb NOT NULL,
	"context" jsonb NOT NULL,
	"progress_status" "members"."pensa_task_status" DEFAULT 'planned' NOT NULL,
	"completed_step_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_criteria_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_ref" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"progress_updated_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"supersedes_task_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

ALTER TABLE "members"."pensa_cycles" ADD CONSTRAINT "pensa_cycles_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_conversations" ADD CONSTRAINT "pensa_conversations_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_artifacts" ADD CONSTRAINT "pensa_artifacts_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_tasks" ADD CONSTRAINT "pensa_tasks_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_tasks" ADD CONSTRAINT "pensa_tasks_supersedes_task_id_pensa_tasks_id_fk" FOREIGN KEY ("supersedes_task_id") REFERENCES "members"."pensa_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "pensa_projects_user_idx" ON "members"."pensa_projects" USING btree ("user_id", "status");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_cycles_project_number_uq" ON "members"."pensa_cycles" USING btree ("project_id", "number");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_conversations_cycle_stage_uq" ON "members"."pensa_conversations" USING btree ("cycle_id", "stage");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_artifacts_cycle_type_version_uq" ON "members"."pensa_artifacts" USING btree ("cycle_id", "type", "version");--> statement-breakpoint
CREATE INDEX "pensa_artifacts_cycle_type_idx" ON "members"."pensa_artifacts" USING btree ("cycle_id", "type");--> statement-breakpoint
CREATE INDEX "pensa_tasks_cycle_position_idx" ON "members"."pensa_tasks" USING btree ("cycle_id", "position");--> statement-breakpoint
CREATE INDEX "pensa_tasks_cycle_status_idx" ON "members"."pensa_tasks" USING btree ("cycle_id", "progress_status");
