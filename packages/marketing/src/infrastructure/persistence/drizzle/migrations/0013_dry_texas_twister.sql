ALTER TABLE "marketing"."metric_account_snapshots" ALTER COLUMN "followers" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_account_snapshots" ALTER COLUMN "followers" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_account_snapshots" ADD COLUMN "collection_version" integer DEFAULT 0 NOT NULL;