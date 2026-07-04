-- Clube dos Criadores (07/2026): snapshot da CONTA do responsável em tópicos/comentários.
-- Chave de coorte da gamificação — usada quando a recompensa do Clube é dada na APROVAÇÃO
-- (o moderador é o ator ali, não a criança). Nullable: posts legados / vitrine não têm.
-- Escrita à MÃO no padrão idempotente do hub (ver CLAUDE.md §Deploy).
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "author_account_id" text;--> statement-breakpoint
ALTER TABLE "hub"."comments" ADD COLUMN IF NOT EXISTS "author_account_id" text;
