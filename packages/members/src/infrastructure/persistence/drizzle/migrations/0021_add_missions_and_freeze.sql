CREATE TABLE "members"."mission_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"mission_slug" text NOT NULL,
	"period_key" text NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "streak_freezes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "freeze_granted_month" text;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "vacation_from" date;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "vacation_to" date;--> statement-breakpoint
CREATE UNIQUE INDEX "mission_claims_user_mission_period_uq" ON "members"."mission_claims" USING btree ("user_id","audience","mission_slug","period_key");--> statement-breakpoint
CREATE INDEX "mission_claims_user_period_idx" ON "members"."mission_claims" USING btree ("user_id","audience","period_key");