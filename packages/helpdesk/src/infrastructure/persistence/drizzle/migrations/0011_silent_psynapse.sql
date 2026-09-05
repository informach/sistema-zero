CREATE TYPE "helpdesk"."portal_notification_status" AS ENUM('pending', 'processing', 'sent');--> statement-breakpoint
CREATE TABLE "helpdesk"."portal_notification_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "helpdesk"."portal_notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "helpdesk"."tickets_requester_idx";--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "ai_generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."portal_notification_outbox" ADD CONSTRAINT "portal_notification_outbox_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."portal_notification_outbox" ADD CONSTRAINT "portal_notification_outbox_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "helpdesk"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_notification_outbox_message_uq" ON "helpdesk"."portal_notification_outbox" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "portal_notification_outbox_pending_idx" ON "helpdesk"."portal_notification_outbox" USING btree ("next_attempt_at","created_at") WHERE "helpdesk"."portal_notification_outbox"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "portal_notification_outbox_lease_idx" ON "helpdesk"."portal_notification_outbox" USING btree ("lease_expires_at","created_at") WHERE "helpdesk"."portal_notification_outbox"."status" = 'processing';--> statement-breakpoint
CREATE INDEX "ticket_messages_rfc822_idx" ON "helpdesk"."ticket_messages" USING btree ("rfc822_message_id") WHERE "helpdesk"."ticket_messages"."rfc822_message_id" is not null and "helpdesk"."ticket_messages"."direction" = 'outbound';--> statement-breakpoint
CREATE INDEX "tickets_requester_email_lower_idx" ON "helpdesk"."tickets" USING btree (lower("requester_email")) WHERE "helpdesk"."tickets"."requester_account_id" is null;--> statement-breakpoint
CREATE INDEX "tickets_search_trgm_idx" ON "helpdesk"."tickets" USING gin ((coalesce("subject", '') || ' ' || coalesce("requester_email", '') || ' ' || coalesce("requester_name", '')) gin_trgm_ops);
