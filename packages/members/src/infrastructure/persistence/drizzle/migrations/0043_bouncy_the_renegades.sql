CREATE TABLE "members"."challenge_custom_themes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emoji" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggested_kit" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."challenge_month_overrides" (
	"month_key" text PRIMARY KEY NOT NULL,
	"builtin_slug" text,
	"custom_theme_id" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by_user_id" uuid,
	CONSTRAINT "challenge_month_overrides_one_theme" CHECK (("members"."challenge_month_overrides"."builtin_slug" IS NULL) <> ("members"."challenge_month_overrides"."custom_theme_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "members"."challenge_month_overrides" ADD CONSTRAINT "challenge_month_overrides_custom_theme_id_challenge_custom_themes_id_fk" FOREIGN KEY ("custom_theme_id") REFERENCES "members"."challenge_custom_themes"("id") ON DELETE no action ON UPDATE no action;