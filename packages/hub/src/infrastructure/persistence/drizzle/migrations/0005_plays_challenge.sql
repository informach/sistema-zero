-- Fase 5 (07/2026): contador de jogadas do link público + desafio mensal (game jam).
-- Escrita à MÃO no padrão idempotente do hub (o db:generate re-emite play_id/community_gated
-- por drift do snapshot — ver CLAUDE.md §Deploy).
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "plays_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "challenge_key" text;--> statement-breakpoint
-- Índice parcial do resolve /jogar (consertando o seq scan pré-existente do
-- hasVisibleShowcasePlayId a cada carga da página pública).
CREATE INDEX IF NOT EXISTS "threads_play_id_idx" ON "hub"."threads" ("play_id") WHERE "play_id" IS NOT NULL;--> statement-breakpoint
-- Prateleira do desafio do mês por canal.
CREATE INDEX IF NOT EXISTS "threads_channel_challenge_idx" ON "hub"."threads" ("channel_id","challenge_key") WHERE "challenge_key" IS NOT NULL;
