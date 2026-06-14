ALTER TYPE "members"."lesson_block_kind" ADD VALUE 'studio';--> statement-breakpoint
CREATE TABLE "members"."studio_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"project" jsonb NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD CONSTRAINT "studio_submissions_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD CONSTRAINT "studio_submissions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD CONSTRAINT "studio_submissions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_submissions_user_block_uq" ON "members"."studio_submissions" USING btree ("user_id","block_id");--> statement-breakpoint
CREATE INDEX "studio_submissions_block_idx" ON "members"."studio_submissions" USING btree ("block_id","submitted_at");