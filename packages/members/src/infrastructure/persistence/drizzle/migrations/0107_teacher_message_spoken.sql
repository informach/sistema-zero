-- Voz para texto (14/10/2026): a criança pode FALAR o recado para a equipe; o servidor transcreve e
-- o app envia texto normal. A marca diz ao Admin que a mensagem foi falada, para a equipe ler um
-- erro de transcrição com boa vontade. Tudo o que já existe foi digitado: `false` por padrão.
-- ⚠️ Numerada 0107 de propósito: o lote das oficinas ao vivo usa 0102 a 0106. No merge, renumere ou
-- reordene esta entrada no `_journal.json` (o `when` decide a ordem de aplicação, não o nome).
ALTER TABLE "members"."studio_submissions" ADD COLUMN IF NOT EXISTS "message_spoken" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."teacher_messages" ADD COLUMN IF NOT EXISTS "spoken" boolean DEFAULT false NOT NULL;
