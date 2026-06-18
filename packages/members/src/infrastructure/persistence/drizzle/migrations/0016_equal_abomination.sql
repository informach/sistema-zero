ALTER TYPE "members"."xp_source_type" ADD VALUE 'studio_passed';--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "results" jsonb;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "passed_at" timestamp with time zone;