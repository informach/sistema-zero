ALTER TABLE "members"."courses" DROP CONSTRAINT "courses_career_slot_check";--> statement-breakpoint
ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_career_slot_check" CHECK ("members"."courses"."career_slot" is null or ("members"."courses"."audience" = 'kids' and "members"."courses"."career_slot" between 1 and 8));
