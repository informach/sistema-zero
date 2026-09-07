ALTER TABLE "members"."creations" ADD COLUMN "format_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_format_version" integer;