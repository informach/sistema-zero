-- Clube dos Criadores (07/2026): recompensa por tópico/comentário APROVADO pela equipe.
-- Dois valores novos no enum de fonte de XP (espelha o 0032 do Pensa). Idempotente.
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'clube_thread';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'clube_comment';
