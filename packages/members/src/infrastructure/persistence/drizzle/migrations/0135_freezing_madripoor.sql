CREATE TABLE "members"."gallery_copy_attempts" (
	"generation" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"not_before" timestamp with time zone NOT NULL,
	"retained_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members"."studio_course_chains" (
	"course_id" uuid NOT NULL,
	"chain" text NOT NULL,
	"environment" jsonb,
	CONSTRAINT "studio_course_chains_course_id_chain_pk" PRIMARY KEY("course_id","chain")
);
--> statement-breakpoint
CREATE TABLE "members"."studio_lesson_baselines" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"block_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."studio_lesson_bindings" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"baseline_id" varchar(64) NOT NULL,
	"workspace_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_lesson_bindings_user_id_block_id_pk" PRIMARY KEY("user_id","block_id")
);
--> statement-breakpoint
ALTER TABLE "members"."zappy_messages" ADD COLUMN "programming_language" varchar(16) DEFAULT 'javascript' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."studio_course_chains" ADD CONSTRAINT "studio_course_chains_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_baselines" ADD CONSTRAINT "studio_lesson_baselines_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_baselines" ADD CONSTRAINT "studio_lesson_baselines_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_baselines" ADD CONSTRAINT "studio_lesson_baselines_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_bindings" ADD CONSTRAINT "studio_lesson_bindings_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_bindings" ADD CONSTRAINT "studio_lesson_bindings_baseline_id_studio_lesson_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "members"."studio_lesson_baselines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_lesson_bindings" ADD CONSTRAINT "studio_lesson_bindings_workspace_id_live_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "members"."live_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_copy_attempts_owner_idx" ON "members"."gallery_copy_attempts" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "gallery_copy_attempts_due_idx" ON "members"."gallery_copy_attempts" USING btree ("not_before","locked_at") WHERE "members"."gallery_copy_attempts"."retained_at" is null and "members"."gallery_copy_attempts"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "studio_lesson_baselines_block_idx" ON "members"."studio_lesson_baselines" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "studio_lesson_baselines_course_idx" ON "members"."studio_lesson_baselines" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "studio_lesson_bindings_account_idx" ON "members"."studio_lesson_bindings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "studio_lesson_bindings_workspace_idx" ON "members"."studio_lesson_bindings" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "members"."zappy_messages" ADD CONSTRAINT "zappy_messages_language_ck" CHECK ("members"."zappy_messages"."programming_language" in ('javascript', 'python'));