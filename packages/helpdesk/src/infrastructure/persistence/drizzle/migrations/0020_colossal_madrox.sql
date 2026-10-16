CREATE TABLE "helpdesk"."automation_handoffs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"reason" text NOT NULL,
	"automation_started_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "helpdesk"."automation_handoffs" ADD CONSTRAINT "automation_handoffs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_handoffs_ticket_uq" ON "helpdesk"."automation_handoffs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "automation_handoffs_created_idx" ON "helpdesk"."automation_handoffs" USING btree ("created_at");