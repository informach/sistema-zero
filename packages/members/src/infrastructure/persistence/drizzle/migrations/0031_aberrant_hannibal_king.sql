CREATE TYPE "members"."pensa_artifact_status" AS ENUM('draft', 'validated');--> statement-breakpoint
CREATE TYPE "members"."pensa_artifact_type" AS ENUM('idea', 'prd', 'friendly_spec', 'identity', 'mission_plan', 'checklist_seed');--> statement-breakpoint
CREATE TYPE "members"."pensa_checklist_category" AS ENUM('test', 'polish', 'publish', 'share');--> statement-breakpoint
CREATE TYPE "members"."pensa_project_kind" AS ENUM('game', 'webapp');--> statement-breakpoint
CREATE TYPE "members"."pensa_project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "members"."pensa_stage" AS ENUM('z', 'e', 'r', 'o', 'done');--> statement-breakpoint
CREATE TYPE "members"."pensa_task_column" AS ENUM('backlog', 'doing', 'review', 'done');--> statement-breakpoint
CREATE TABLE "members"."pensa_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"stage" "members"."pensa_stage" NOT NULL,
	"type" "members"."pensa_artifact_type" NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"status" "members"."pensa_artifact_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_checklist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"category" "members"."pensa_checklist_category" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"stage" "members"."pensa_stage" NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"kind" "members"."pensa_project_kind" NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "members"."pensa_project_status" DEFAULT 'active' NOT NULL,
	"studio_project_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text,
	"task_type" varchar(40),
	"mission" jsonb NOT NULL,
	"board_column" "members"."pensa_task_column" DEFAULT 'backlog' NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."pensa_artifacts" ADD CONSTRAINT "pensa_artifacts_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_checklist_items" ADD CONSTRAINT "pensa_checklist_items_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_conversations" ADD CONSTRAINT "pensa_conversations_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_cycles" ADD CONSTRAINT "pensa_cycles_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_tasks" ADD CONSTRAINT "pensa_tasks_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_artifacts_cycle_type_version_uq" ON "members"."pensa_artifacts" USING btree ("cycle_id","type","version");--> statement-breakpoint
CREATE INDEX "pensa_artifacts_cycle_type_idx" ON "members"."pensa_artifacts" USING btree ("cycle_id","type");--> statement-breakpoint
CREATE INDEX "pensa_checklist_cycle_idx" ON "members"."pensa_checklist_items" USING btree ("cycle_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_conversations_cycle_stage_uq" ON "members"."pensa_conversations" USING btree ("cycle_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_cycles_project_number_uq" ON "members"."pensa_cycles" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "pensa_projects_user_idx" ON "members"."pensa_projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "pensa_tasks_cycle_idx" ON "members"."pensa_tasks" USING btree ("cycle_id","board_column","position");