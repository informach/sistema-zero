-- Defensivo (idempotente): garante zero linhas com account_id nulo ANTES do SET
-- NOT NULL. A migration 0014 já fez o backfill e o award sempre grava no INSERT;
-- isto cobre qualquer linha residual (a conta É o id quando não houve sessão de perfil).
UPDATE "members"."gamification_profiles" SET "account_id" = "user_id" WHERE "account_id" IS NULL;--> statement-breakpoint
ALTER TABLE "members"."gamification_profiles" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "gamification_profiles_ranking_idx" ON "members"."gamification_profiles" USING btree ("audience","privileged","xp");--> statement-breakpoint
CREATE INDEX "gamification_profiles_account_idx" ON "members"."gamification_profiles" USING btree ("account_id");