ALTER TABLE "hub"."reports" ADD COLUMN IF NOT EXISTS "reporter_account_id" text;
ALTER TABLE "hub"."reports" ADD COLUMN IF NOT EXISTS "reporter_display_name" text;
