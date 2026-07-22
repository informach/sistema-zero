ALTER TABLE "members"."courses" ADD COLUMN "career_slot" smallint;--> statement-breakpoint
ALTER TABLE "members"."xp_events" ADD COLUMN "source_career_slot" smallint;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_career_slot_uq" ON "members"."courses" USING btree ("audience","level","track","career_slot") WHERE "members"."courses"."career_slot" is not null;--> statement-breakpoint
ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_career_slot_check" CHECK ("members"."courses"."career_slot" is null or "members"."courses"."career_slot" between 1 and 6);