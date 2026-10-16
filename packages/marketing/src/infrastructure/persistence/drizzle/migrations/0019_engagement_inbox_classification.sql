DROP INDEX "marketing"."engagement_inbox_idx";--> statement-breakpoint
ALTER TABLE "marketing"."engagement_conversations" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_conversations" ADD COLUMN "outcome" text;--> statement-breakpoint
CREATE INDEX "engagement_inbox_idx" ON "marketing"."engagement_conversations" USING btree ("account_id","updated_at","id");