CREATE TABLE "members"."lesson_criteria_migration_snapshots" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"previous_sections" jsonb NOT NULL,
	"migrated_sections" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"lesson_id" uuid NOT NULL,
	"block_id" uuid,
	"section_id" uuid,
	"kind" text NOT NULL,
	"revision" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."teacher_broadcast_recipients" (
	"broadcast_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_email" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "teacher_broadcast_recipients_broadcast_id_profile_id_pk" PRIMARY KEY("broadcast_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "members"."teacher_broadcasts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"audience" jsonb NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" varchar(8000) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members"."teacher_messages" ADD COLUMN "help_context" jsonb;--> statement-breakpoint
ALTER TABLE "members"."teacher_threads" ADD COLUMN "broadcast_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."teacher_threads" ADD COLUMN "workflow_status" text DEFAULT 'waiting_student' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."teacher_broadcast_recipients" ADD CONSTRAINT "teacher_broadcast_recipients_broadcast_id_teacher_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "members"."teacher_broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_evidence_owner_idx" ON "members"."lesson_evidence" USING btree ("user_id","lesson_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_delivery_thread_uq" ON "members"."teacher_broadcast_recipients" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "teacher_delivery_pending_idx" ON "members"."teacher_broadcast_recipients" USING btree ("status","broadcast_id");--> statement-breakpoint
ALTER TABLE "members"."teacher_threads" ADD CONSTRAINT "teacher_threads_broadcast_id_teacher_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "members"."teacher_broadcasts"("id") ON DELETE set null ON UPDATE no action;