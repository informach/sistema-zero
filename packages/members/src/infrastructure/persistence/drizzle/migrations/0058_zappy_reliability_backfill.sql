UPDATE "members"."zappy_messages"
SET "processing_until" = "created_at"
WHERE "role" = 'user' AND "processing_until" IS NULL;
--> statement-breakpoint
UPDATE "members"."zappy_knowledge_sources" AS source
SET "block_id" = block."id", "block_revision" = md5(block."content"::text)
FROM "members"."lesson_blocks" AS block
WHERE source."source_ref" = 'block:' || block."id"::text
  AND source."lesson_id" = block."lesson_id"
  AND (
    source."block_id" IS DISTINCT FROM block."id"
    OR source."block_revision" IS DISTINCT FROM md5(block."content"::text)
  );
--> statement-breakpoint
DELETE FROM "members"."zappy_knowledge_sources"
WHERE "source_ref" LIKE 'block:%' AND "block_id" IS NULL;
