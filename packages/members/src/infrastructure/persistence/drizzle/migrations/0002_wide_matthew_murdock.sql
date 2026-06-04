CREATE TABLE "members"."quiz_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_block_idx" ON "members"."quiz_attempts" USING btree ("user_id","block_id","created_at");