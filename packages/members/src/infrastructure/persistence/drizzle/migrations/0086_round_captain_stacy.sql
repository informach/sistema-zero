CREATE TABLE "members"."profile_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"kids_theme" text DEFAULT 'padrao' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "profile_preferences_kids_theme_check" CHECK ("members"."profile_preferences"."kids_theme" in ('padrao', 'pink'))
);
--> statement-breakpoint
CREATE INDEX "profile_preferences_account_idx" ON "members"."profile_preferences" USING btree ("account_id");