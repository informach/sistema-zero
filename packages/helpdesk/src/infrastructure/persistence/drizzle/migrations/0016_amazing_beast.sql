CREATE TYPE "helpdesk"."automation_job_state" AS ENUM('pending', 'processing', 'completed', 'handoff', 'superseded');--> statement-breakpoint
CREATE TYPE "helpdesk"."handling_mode" AS ENUM('human', 'assistant');--> statement-breakpoint
CREATE TABLE "helpdesk"."automation_evaluations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."automation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"epoch" integer NOT NULL,
	"policy_version" integer NOT NULL,
	"mode" text NOT NULL,
	"state" "helpdesk"."automation_job_state" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"run_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."automation_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"policy" jsonb DEFAULT '{"mode":"off","categories":[],"cohortPercent":0,"dailyBudgetMicros":0,"attemptReserveMicros":0,"accountDailyLimit":20,"evaluationId":null}'::jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."automation_policy_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"policy" jsonb NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."automation_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"reserved_micros" integer NOT NULL,
	"known_micros" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."customer_commands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"key" uuid NOT NULL,
	"hash" text NOT NULL,
	"ticket_id" uuid NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."message_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"chunk_id" uuid NOT NULL,
	"title" text NOT NULL,
	"section" text NOT NULL,
	"revision_number" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "automation_generation" integer;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "handling_mode" "helpdesk"."handling_mode" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "handling_epoch" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "human_takeover" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "automation_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "human_sla_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "handoff_reason" text;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "automation_replies" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "automation_clarifications" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."automation_jobs" ADD CONSTRAINT "automation_jobs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."automation_reservations" ADD CONSTRAINT "automation_reservations_job_id_automation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "helpdesk"."automation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."customer_commands" ADD CONSTRAINT "customer_commands_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."customer_commands" ADD CONSTRAINT "customer_commands_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "helpdesk"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."message_evidence" ADD CONSTRAINT "message_evidence_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "helpdesk"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."message_evidence" ADD CONSTRAINT "message_evidence_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "helpdesk"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."message_evidence" ADD CONSTRAINT "message_evidence_revision_id_kb_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "helpdesk"."kb_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."message_evidence" ADD CONSTRAINT "message_evidence_chunk_id_kb_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "helpdesk"."kb_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_jobs_generation_uq" ON "helpdesk"."automation_jobs" USING btree ("ticket_id","generation");--> statement-breakpoint
CREATE INDEX "automation_jobs_due_idx" ON "helpdesk"."automation_jobs" USING btree ("state","next_at");--> statement-breakpoint
CREATE INDEX "automation_jobs_deadline_idx" ON "helpdesk"."automation_jobs" USING btree ("state","deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_reservations_attempt_uq" ON "helpdesk"."automation_reservations" USING btree ("job_id","attempt");--> statement-breakpoint
CREATE INDEX "automation_reservations_date_idx" ON "helpdesk"."automation_reservations" USING btree ("created_at","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_commands_key_uq" ON "helpdesk"."customer_commands" USING btree ("account_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "message_evidence_chunk_uq" ON "helpdesk"."message_evidence" USING btree ("message_id","chunk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_messages_auto_generation_uq" ON "helpdesk"."ticket_messages" USING btree ("ticket_id","automation_generation");