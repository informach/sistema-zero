ALTER TABLE "hub"."reports" ADD COLUMN "space_audience" "hub"."audience";
--> statement-breakpoint
UPDATE "hub"."reports" AS report
SET "space_audience" = space."audience"
FROM "hub"."spaces" AS space
WHERE report."space_id" = space."id"
  AND report."space_audience" IS NULL;
