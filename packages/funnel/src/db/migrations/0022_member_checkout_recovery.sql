ALTER TABLE "funil"."member_checkouts" ADD COLUMN "presentation" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "funil"."member_checkouts" ADD COLUMN "pending_request" jsonb;