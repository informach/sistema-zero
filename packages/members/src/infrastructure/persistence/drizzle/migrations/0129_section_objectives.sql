-- Objetivos da parte (18/10/2026): XP do objetivo EXTRA e a memória do último resultado de cada
-- objetivo. Idempotente (IF NOT EXISTS) como as outras migrations aditivas. O valor novo do enum
-- não é ESCRITO nesta migration (o Postgres proíbe usar um valor de enum na transação que o cria).
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'objective_extra';--> statement-breakpoint
ALTER TABLE "members"."lesson_section_progress" ADD COLUMN IF NOT EXISTS "objective_results" jsonb;
