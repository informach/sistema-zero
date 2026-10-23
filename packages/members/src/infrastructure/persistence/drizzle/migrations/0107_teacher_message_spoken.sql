-- Voz para texto (14/10/2026): a criança pode FALAR o recado para a equipe; o servidor transcreve e
-- o app envia texto normal. A marca diz ao Admin que a mensagem foi falada, para a equipe ler um
-- erro de transcrição com boa vontade. Tudo o que já existe foi digitado: `false` por padrão.
-- Vem depois do lote das oficinas ao vivo (0102 a 0106); `IF NOT EXISTS` deixa a reaplicação
-- inofensiva num banco de teste que já recebeu a versão anterior desta migration.
ALTER TABLE "members"."studio_submissions" ADD COLUMN IF NOT EXISTS "message_spoken" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."teacher_messages" ADD COLUMN IF NOT EXISTS "spoken" boolean DEFAULT false NOT NULL;
