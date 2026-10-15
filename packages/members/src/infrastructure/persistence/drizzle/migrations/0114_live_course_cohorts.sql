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
UPDATE "members"."live_cohorts" SET "document" = jsonb_set("document", '{status}', '"archived"') WHERE "course_id" IS NULL AND jsonb_typeof("document") = 'object' AND "document"->>'status' IS DISTINCT FROM 'archived';--> statement-breakpoint
-- Presença no encontro: o batimento grava esta linha pequena, nunca o documento da ocorrência.
CREATE TABLE IF NOT EXISTS "members"."live_presence" (
	"occurrence_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"activity_at" timestamp with time zone,
	CONSTRAINT "live_presence_occurrence_id_actor_id_pk" PRIMARY KEY("occurrence_id","actor_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "members"."live_presence" ADD CONSTRAINT "live_presence_occurrence_id_live_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "members"."live_occurrences"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_presence_account_idx" ON "members"."live_presence" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_presence_actor_idx" ON "members"."live_presence" USING btree ("actor_id");
