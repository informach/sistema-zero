-- Cursos ao vivo (14/10/2026): a turma passa a ser de um CURSO de modalidade "ao vivo" e o
-- projeto ao vivo passa a ser por BLOCO Estúdio da aula. Tudo idempotente: os testes de banco
-- aplicam este arquivo de novo sobre bancos que já o têm.
ALTER TABLE "members"."live_cohorts" ALTER COLUMN "program_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."live_cohorts" ADD COLUMN IF NOT EXISTS "course_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_cohorts_course_idx" ON "members"."live_cohorts" USING btree ("course_id");--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN IF NOT EXISTS "segments" jsonb;--> statement-breakpoint
ALTER TABLE "members"."live_workspaces" ADD COLUMN IF NOT EXISTS "project_key" text;--> statement-breakpoint
ALTER TABLE "members"."live_workspaces" ADD COLUMN IF NOT EXISTS "lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- A chave antiga (encontro + criança) vale só para os projetos do roteiro antigo; o projeto por
-- bloco tem a sua (criança + curso + chain/bloco), e uma aula pode ter mais de um bloco Estúdio.
DROP INDEX IF EXISTS "members"."live_workspace_session_learner_uq";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "live_workspace_session_learner_uq" ON "members"."live_workspaces" USING btree ("session_id","learner_id") WHERE "members"."live_workspaces"."project_key" is null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "live_workspace_learner_key_uq" ON "members"."live_workspaces" USING btree ("learner_id","project_key") WHERE "members"."live_workspaces"."project_key" is not null;--> statement-breakpoint
-- As oficinas nunca foram para produção: a turma antiga do roteiro vira arquivada (o serviço
-- passa a ignorá-la). Nenhum dado de família real.
UPDATE "members"."live_cohorts" SET "document" = jsonb_set("document", '{status}', '"archived"') WHERE "course_id" IS NULL AND jsonb_typeof("document") = 'object' AND "document"->>'status' IS DISTINCT FROM 'archived';
