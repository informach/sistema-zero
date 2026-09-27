CREATE TABLE "members"."lesson_section_progress" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"revision" varchar(32) NOT NULL,
	"completed_at" timestamp with time zone,
	"project_passed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "lesson_section_progress_user_id_lesson_id_section_id_pk" PRIMARY KEY("user_id","lesson_id","section_id")
);
--> statement-breakpoint
ALTER TABLE "members"."lesson_section_progress" ADD CONSTRAINT "lesson_section_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_section_progress_account_idx" ON "members"."lesson_section_progress" USING btree ("account_id");