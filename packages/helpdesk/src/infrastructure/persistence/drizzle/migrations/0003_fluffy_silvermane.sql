CREATE TYPE "helpdesk"."message_delivery_state" AS ENUM('pending', 'sent', 'unknown');--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "delivery_state" "helpdesk"."message_delivery_state";--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "delivery_last_error" text;--> statement-breakpoint
UPDATE "helpdesk"."ticket_messages" SET "delivery_state" = 'sent' WHERE "kind" = 'email';--> statement-breakpoint
UPDATE "helpdesk"."settings" SET "auto_reply_enabled" = false WHERE "auto_reply_enabled" = true;--> statement-breakpoint
CREATE INDEX "ticket_messages_delivery_idx" ON "helpdesk"."ticket_messages" USING btree ("ticket_id","delivery_state","created_at");
