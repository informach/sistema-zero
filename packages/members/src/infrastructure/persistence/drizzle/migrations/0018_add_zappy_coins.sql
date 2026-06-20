CREATE TYPE "members"."coin_source_type" AS ENUM('lesson_complete', 'quiz_passed', 'unit_complete', 'studio_passed', 'streak_milestone', 'mission_reward', 'league_reward', 'spend_cosmetic', 'spend_room', 'spend_streak_freeze', 'admin_adjust');--> statement-breakpoint
CREATE TABLE "members"."coin_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'adult' NOT NULL,
	"source_type" "members"."coin_source_type" NOT NULL,
	"source_id" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "coin_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "coins_earned_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "coins_earned_date" date;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ADD COLUMN "lifetime_coins_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "coin_events_user_source_uq" ON "members"."coin_events" USING btree ("user_id","audience","source_type","source_id");--> statement-breakpoint
CREATE INDEX "coin_events_user_created_idx" ON "members"."coin_events" USING btree ("user_id","created_at");