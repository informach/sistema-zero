ALTER TABLE "members"."profile_preferences" DROP CONSTRAINT "profile_preferences_kids_theme_check";--> statement-breakpoint
ALTER TABLE "members"."profile_preferences" RENAME COLUMN "kids_theme" TO "palette";--> statement-breakpoint
ALTER TABLE "members"."profile_preferences" ALTER COLUMN "palette" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "members"."profile_preferences" ALTER COLUMN "palette" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."profile_preferences" ALTER COLUMN "palette" SET DATA TYPE varchar(32);--> statement-breakpoint
UPDATE "members"."profile_preferences" SET "palette" = NULL WHERE "palette" = 'padrao';--> statement-breakpoint
ALTER TABLE "members"."profile_preferences" ADD CONSTRAINT "profile_preferences_palette_shape_check" CHECK ("members"."profile_preferences"."palette" is null or "members"."profile_preferences"."palette" ~ '^[a-z0-9-]{1,32}$');
