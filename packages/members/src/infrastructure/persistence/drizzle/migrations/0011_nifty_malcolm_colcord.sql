ALTER TYPE "members"."xp_source_type" ADD VALUE 'quiz_perfect';--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "privileged" boolean DEFAULT false NOT NULL;