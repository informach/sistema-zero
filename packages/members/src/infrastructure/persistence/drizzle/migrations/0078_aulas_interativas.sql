ALTER TYPE "members"."lesson_block_kind" ADD VALUE 'interactive';--> statement-breakpoint
ALTER TYPE "members"."teacher_thread_context" ADD VALUE 'lesson_section';--> statement-breakpoint
CREATE TABLE "members"."learning_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"revision" varchar(32) NOT NULL,
	"answers" jsonb NOT NULL,
	"hints_used" integer NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_block_progress" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"revision" varchar(32) NOT NULL,
	"position_seconds" integer,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lesson_block_progress_user_id_block_id_pk" PRIMARY KEY("user_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_navigation" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lesson_navigation_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_structures" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"revision" uuid NOT NULL,
	"sections" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."lesson_block_progress" ADD CONSTRAINT "lesson_block_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lesson_block_progress" ADD CONSTRAINT "lesson_block_progress_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lesson_navigation" ADD CONSTRAINT "lesson_navigation_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lesson_structures" ADD CONSTRAINT "lesson_structures_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_attempts_owner_lesson_idx" ON "members"."learning_attempts" USING btree ("user_id","account_id","lesson_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_block_progress_account_lesson_idx" ON "members"."lesson_block_progress" USING btree ("account_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_navigation_account_idx" ON "members"."lesson_navigation" USING btree ("account_id");