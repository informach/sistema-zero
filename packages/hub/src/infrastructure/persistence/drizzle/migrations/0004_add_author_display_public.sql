-- Snapshot do nome + flag pública do autor em comentários e tópicos (nomes clicáveis
-- no Mural/Clube → perfil público). `IF NOT EXISTS` segue o padrão idempotente do hub
-- (ver CLAUDE.md §Deploy). As linhas de `play_id` (0003) e `community_gated` (0002) que o
-- db:generate re-emitiu (drift do snapshot) foram REMOVIDAS — já estão aplicadas.
ALTER TABLE "hub"."comments" ADD COLUMN IF NOT EXISTS "author_display_name" text;--> statement-breakpoint
ALTER TABLE "hub"."comments" ADD COLUMN IF NOT EXISTS "author_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "author_public" boolean DEFAULT false NOT NULL;
