CREATE TABLE "members"."adult_challenge_custom_themes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emoji" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."adult_challenge_month_overrides" (
	"month_key" text PRIMARY KEY NOT NULL,
	"builtin_slug" text,
	"custom_theme_id" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by_user_id" uuid,
	CONSTRAINT "adult_challenge_month_overrides_one_theme" CHECK (("members"."adult_challenge_month_overrides"."builtin_slug" IS NULL) <> ("members"."adult_challenge_month_overrides"."custom_theme_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "members"."adult_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(60) NOT NULL,
	"public_enabled" boolean DEFAULT false NOT NULL,
	"voice_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."adult_challenge_month_overrides" ADD CONSTRAINT "adult_challenge_month_overrides_custom_theme_id_adult_challenge_custom_themes_id_fk" FOREIGN KEY ("custom_theme_id") REFERENCES "members"."adult_challenge_custom_themes"("id") ON DELETE no action ON UPDATE no action;