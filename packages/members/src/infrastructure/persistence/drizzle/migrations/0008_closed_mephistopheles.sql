CREATE TYPE "members"."course_audience" AS ENUM('adult', 'kids');--> statement-breakpoint
ALTER TABLE "members"."courses" ADD COLUMN "audience" "members"."course_audience" DEFAULT 'adult' NOT NULL;