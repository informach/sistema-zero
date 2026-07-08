CREATE TYPE "members"."teacher_message_role" AS ENUM('teacher', 'student');--> statement-breakpoint
CREATE TYPE "members"."teacher_thread_context" AS ENUM('studio_submission', 'mural_publication', 'general');--> statement-breakpoint
CREATE TABLE "members"."teacher_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_role" "members"."teacher_message_role" NOT NULL,
	"author_id" uuid,
	"author_name" text,
	"body" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."teacher_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"context_type" "members"."teacher_thread_context" NOT NULL,
	"context_ref" text,
	"course_id" uuid,
	"lesson_id" uuid,
	"title" text,
	"last_message_at" timestamp with time zone NOT NULL,
	"student_last_read_at" timestamp with time zone,
	"teacher_last_read_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."teacher_messages" ADD CONSTRAINT "teacher_messages_thread_id_teacher_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "members"."teacher_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_messages_thread_idx" ON "members"."teacher_messages" USING btree ("thread_id","author_role","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_threads_context_uq" ON "members"."teacher_threads" USING btree ("user_id","context_type","context_ref") WHERE "members"."teacher_threads"."context_type" <> 'general';--> statement-breakpoint
CREATE INDEX "teacher_threads_user_lastmsg_idx" ON "members"."teacher_threads" USING btree ("user_id","audience","last_message_at");--> statement-breakpoint
CREATE INDEX "teacher_threads_lastmsg_idx" ON "members"."teacher_threads" USING btree ("last_message_at");