CREATE TYPE "members"."course_journey_role" AS ENUM('positioned', 'reward', 'extra');--> statement-breakpoint
ALTER TABLE "members"."courses" ADD COLUMN "journey_role" "members"."course_journey_role" DEFAULT 'reward' NOT NULL;--> statement-breakpoint
UPDATE "members"."courses" SET "journey_role" = 'positioned' WHERE "career_slot" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_journey_role_slot_check" CHECK (("members"."courses"."journey_role" = 'positioned') = ("members"."courses"."career_slot" is not null));
