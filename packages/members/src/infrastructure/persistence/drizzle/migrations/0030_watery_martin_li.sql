ALTER TABLE "members"."xp_events" ADD COLUMN "source_level" "members"."course_level";--> statement-breakpoint
UPDATE "members"."xp_events" AS "e"
SET "source_level" = "c"."level"
FROM "members"."courses" AS "c"
WHERE "e"."source_id" = "c"."id"
  AND "e"."source_type" IN ('course_complete', 'course_showcased')
  AND "e"."source_level" IS NULL;
