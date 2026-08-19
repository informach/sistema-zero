ALTER TABLE "members"."creations" ADD COLUMN "parts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_parts" jsonb;