-- Backup da versão anterior da entrega (undo de 1 passo do upsert último-vence).
-- A cada REENVIO, o upsert copia o projeto/data que estavam na linha para estas
-- colunas antes de sobrescrever; o professor restaura pelo admin
-- (`POST /members/admin/studio-submissions/:blockId/:userId/restore-previous`).
-- Protege a entrega boa de um reenvio acidental do template (editor semeado do
-- projeto inicial num navegador novo quando o GET best-effort do save na nuvem
-- falha). Nullable, sem backfill: linha sem reenvio não tem versão anterior.
--
-- ⚠️ O db:generate re-propôs aqui o `ALTER TYPE ... ADD VALUE 'pinta'` da 0065
-- (que é hand-authored e não tem snapshot próprio); foi REMOVIDO deste SQL —
-- regra do CLAUDE.md: manter só o DDL novo. O snapshot 0066 gerado já incorpora
-- o enum completo e cura a linhagem para as próximas migrations.
ALTER TABLE "members"."studio_submissions" ADD COLUMN "previous_project" jsonb;--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "previous_submitted_at" timestamp with time zone;
