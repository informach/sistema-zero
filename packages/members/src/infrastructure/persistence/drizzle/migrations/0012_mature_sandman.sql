DROP INDEX "members"."gamification_profiles_user_uq";--> statement-breakpoint
DROP INDEX "members"."user_badges_user_badge_uq";--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "audience" "members"."course_audience" DEFAULT 'adult' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."user_badges" ADD COLUMN "audience" "members"."course_audience" DEFAULT 'adult' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."xp_events" ADD COLUMN "audience" "members"."course_audience" DEFAULT 'adult' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "gamification_profiles_user_audience_uq" ON "members"."gamification_profiles" USING btree ("user_id","audience");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_audience_badge_uq" ON "members"."user_badges" USING btree ("user_id","audience","badge_slug");