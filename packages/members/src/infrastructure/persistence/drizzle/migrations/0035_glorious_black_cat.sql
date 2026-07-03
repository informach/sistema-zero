CREATE TABLE "members"."parent_report_prefs" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."parent_reports_sent" (
	"account_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "parent_reports_sent_account_week_uq" ON "members"."parent_reports_sent" USING btree ("account_id","week_key");