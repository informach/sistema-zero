CREATE TYPE "helpdesk"."message_visibility" AS ENUM('customer', 'internal');--> statement-breakpoint
CREATE TYPE "helpdesk"."ticket_source" AS ENUM('email', 'portal');--> statement-breakpoint
ALTER TYPE "helpdesk"."message_kind" ADD VALUE 'portal';--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ALTER COLUMN "gmail_thread_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "visibility" "helpdesk"."message_visibility" DEFAULT 'customer' NOT NULL;--> statement-breakpoint
UPDATE "helpdesk"."ticket_messages" SET "visibility" = 'internal' WHERE "kind" = 'note';--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "source" "helpdesk"."ticket_source" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "requester_account_id" uuid;--> statement-breakpoint
CREATE INDEX "tickets_requester_account_idx" ON "helpdesk"."tickets" USING btree ("requester_account_id","last_message_at");
