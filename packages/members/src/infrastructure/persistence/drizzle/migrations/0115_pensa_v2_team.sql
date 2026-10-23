-- 0115 (14/10/2026): equipe no Pensa v2. Gerada pelo `db:generate` (relógio real, acima da 0114 das
-- oficinas) e trocada pelo DDL idempotente abaixo, com o mesmo resultado.
-- Equipe no Pensa v2: as funções do plano (`code` = quem programa, UMA por plano; `art` = quem
-- faz as artes) e, em cada missão, quem a começou e quem a concluiu. Idempotente (`IF NOT
-- EXISTS`; a FK mora dentro do CREATE TABLE): um banco de teste que já recebeu esta migration
-- com outro número não quebra ao aplicá-la de novo.
CREATE TABLE IF NOT EXISTS "members"."pensa_project_roles" (
	"project_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" varchar(8) NOT NULL,
	"assigned_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pensa_project_roles_project_id_profile_id_role_pk" PRIMARY KEY("project_id","profile_id","role"),
	CONSTRAINT "pensa_project_roles_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "pensa_project_roles_role_check" CHECK ("members"."pensa_project_roles"."role" in ('code', 'art'))
);
--> statement-breakpoint
ALTER TABLE "members"."pensa_tasks" ADD COLUMN IF NOT EXISTS "assignee_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."pensa_tasks" ADD COLUMN IF NOT EXISTS "completed_by_profile_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pensa_project_roles_code_uq" ON "members"."pensa_project_roles" USING btree ("project_id") WHERE "members"."pensa_project_roles"."role" = 'code';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pensa_project_roles_profile_idx" ON "members"."pensa_project_roles" USING btree ("profile_id");
