CREATE TYPE "members"."xp_source_type" AS ENUM('lesson_complete', 'quiz_passed', 'unit_complete');--> statement-breakpoint
CREATE TABLE "members"."gamification_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_best" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."user_badges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_slug" text NOT NULL,
	"unlocked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."xp_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" "members"."xp_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gamification_profiles_user_uq" ON "members"."gamification_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_uq" ON "members"."user_badges" USING btree ("user_id","badge_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_events_user_source_uq" ON "members"."xp_events" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "xp_events_user_created_idx" ON "members"."xp_events" USING btree ("user_id","created_at");