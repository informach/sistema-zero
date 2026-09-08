CREATE TABLE "members"."practice_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"course_slug" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"title" text NOT NULL,
	"quiz" jsonb NOT NULL,
	"answers" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "practice_sessions_owner_created_idx" ON "members"."practice_sessions" USING btree ("user_id","account_id","created_at");--> statement-breakpoint
CREATE INDEX "practice_sessions_account_idx" ON "members"."practice_sessions" USING btree ("account_id");