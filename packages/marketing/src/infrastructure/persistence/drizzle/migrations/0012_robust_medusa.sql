ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "views" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "views" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "likes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "likes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "comments" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "comments" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "shares" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "shares" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "saves" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ALTER COLUMN "saves" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ADD COLUMN "collection_version" integer DEFAULT 0 NOT NULL;