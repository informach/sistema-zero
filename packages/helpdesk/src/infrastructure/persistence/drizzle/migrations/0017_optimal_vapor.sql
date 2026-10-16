CREATE TABLE "helpdesk"."resolution_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"automated" boolean NOT NULL,
	"generation" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "helpdesk"."resolution_events" ADD CONSTRAINT "resolution_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resolution_events_created_idx" ON "helpdesk"."resolution_events" USING btree ("created_at");