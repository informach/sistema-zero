-- Cerca de exclusão de conta (19/08/2026): a conta apagada no auth entra aqui e o hub
-- passa a recusar conteúdo/reações dela enquanto a limpeza durável termina.
CREATE TABLE IF NOT EXISTS "hub"."account_deletion_fences" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ⚠️ O `db:generate` re-emitiu aqui, SEM `IF NOT EXISTS`, o DRIFT das migrations 0005–0008
-- (escritas à mão, sem snapshot próprio): `plays_count`/`challenge_key`/`studio_meta`/
-- `author_account_id`/`reporter_*` e os dois índices parciais — TODOS já aplicados em staging e
-- produção (conferido em 19/08 no banco de prod). Como vieram, o `preDeployCommand` abortaria no
-- 1º `ADD COLUMN` e o hub não subiria. Ficam abaixo em forma IDEMPOTENTE (mesmo padrão das
-- 0002/0003/0004/0006/0007/0008) — num banco novo criam; num banco vivo são no-op. O snapshot
-- 0009 já incorpora tudo e cura a linhagem para as próximas migrations (regra do CLAUDE.md).
ALTER TABLE "hub"."comments" ADD COLUMN IF NOT EXISTS "author_account_id" text;--> statement-breakpoint
ALTER TABLE "hub"."reports" ADD COLUMN IF NOT EXISTS "reporter_account_id" text;--> statement-breakpoint
ALTER TABLE "hub"."reports" ADD COLUMN IF NOT EXISTS "reporter_display_name" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "author_account_id" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "plays_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "challenge_key" text;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "studio_meta" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_play_id_idx" ON "hub"."threads" USING btree ("play_id") WHERE "hub"."threads"."play_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_channel_challenge_idx" ON "hub"."threads" USING btree ("channel_id","challenge_key") WHERE "hub"."threads"."challenge_key" is not null;
