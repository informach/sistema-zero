ALTER TABLE "members"."pensa_projects" ADD COLUMN "build_env" text;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "studio_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "studio_snapshot_at" timestamp with time zone;