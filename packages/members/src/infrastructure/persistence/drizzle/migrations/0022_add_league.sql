CREATE TABLE "members"."league_membership" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"week_key" text NOT NULL,
	"tier" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "league_membership_user_week_uq" ON "members"."league_membership" USING btree ("user_id","audience","week_key");--> statement-breakpoint
CREATE INDEX "league_membership_cohort_idx" ON "members"."league_membership" USING btree ("audience","week_key","tier");