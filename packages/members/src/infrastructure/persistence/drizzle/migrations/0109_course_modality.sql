ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'live_encounter';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'live_course_complete';--> statement-breakpoint
ALTER TABLE "members"."courses" ADD COLUMN IF NOT EXISTS "modality" text DEFAULT 'recorded' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_modality_check" CHECK ("members"."courses"."modality" in ('recorded', 'live'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_live_off_journey_check" CHECK ("members"."courses"."modality" = 'recorded' or "members"."courses"."career_slot" is null);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
