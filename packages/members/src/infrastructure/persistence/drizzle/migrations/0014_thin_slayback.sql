ALTER TABLE "members"."gamification_profiles" ADD COLUMN "account_id" uuid;--> statement-breakpoint
-- Backfill: linhas legadas (pré-perfis) têm account_id = user_id (a conta É o id).
-- Sem isto, a coorte do ranking (que filtra por account_id) excluiria todos os
-- perfis existentes até o backfill da PR6. O award novo já grava account_id.
UPDATE "members"."gamification_profiles" SET "account_id" = "user_id" WHERE "account_id" IS NULL;