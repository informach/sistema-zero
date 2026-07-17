CREATE TYPE "members"."course_track" AS ENUM('2d', '3d');--> statement-breakpoint
ALTER TABLE "members"."courses" ADD COLUMN "track" "members"."course_track" DEFAULT '2d' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."xp_events" ADD COLUMN "source_track" "members"."course_track";