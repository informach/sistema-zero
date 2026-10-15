ALTER TABLE "members"."studio_builder_jobs" ADD COLUMN "model" varchar(160) NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."studio_builder_jobs" ADD COLUMN "binaries" jsonb NOT NULL;