CREATE TABLE "helpdesk"."ai_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."ai_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid,
	"generation" integer,
	"detail" jsonb NOT NULL,
	"resolved_article_id" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "ai_run_id" uuid;--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "draft_edited" boolean;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "ai_draft_run_id" uuid;--> statement-breakpoint
ALTER TABLE "helpdesk"."ai_feedback" ADD CONSTRAINT "ai_feedback_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "helpdesk"."ai_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."ai_runs" ADD CONSTRAINT "ai_runs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."ai_runs" ADD CONSTRAINT "ai_runs_resolved_article_id_kb_articles_id_fk" FOREIGN KEY ("resolved_article_id") REFERENCES "helpdesk"."kb_articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_feedback_run_actor_kind_uq" ON "helpdesk"."ai_feedback" USING btree ("run_id","actor_id","kind");--> statement-breakpoint
CREATE INDEX "ai_runs_ticket_idx" ON "helpdesk"."ai_runs" USING btree ("ticket_id","generation");--> statement-breakpoint
CREATE INDEX "ai_runs_retention_idx" ON "helpdesk"."ai_runs" USING btree ("created_at");