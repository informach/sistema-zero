ALTER TABLE "members"."lesson_blocks" ADD COLUMN IF NOT EXISTS "content_revision" varchar(32) DEFAULT md5(random()::text || clock_timestamp()::text) NOT NULL;
--> statement-breakpoint
-- Fontes anteriores não carregavam a revisão esperada durante a extração. Elas
-- não podem ser promovidas para o novo contrato por inferência: o backfill
-- incremental as reconstruirá com o token autoritativo do bloco.
DELETE FROM "members"."zappy_knowledge_chunks"
WHERE "source_id" IN (
  SELECT "id"
  FROM "members"."zappy_knowledge_sources"
  WHERE "block_id" IS NOT NULL
);
--> statement-breakpoint
UPDATE "members"."zappy_knowledge_sources"
SET
  "block_revision" = NULL,
  "status" = 'pending',
  "error" = 'Reindexação necessária após validação de revisão',
  "updated_at" = now()
WHERE "block_id" IS NOT NULL;
