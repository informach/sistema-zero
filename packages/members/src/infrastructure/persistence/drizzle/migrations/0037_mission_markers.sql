-- Reforma das missões (07/2026): novas fontes de missão como MARCOS (amount 0 — só
-- contam p/ o progresso; o prêmio vem do claim). Cinco valores novos no enum de fonte
-- de XP (espelha o 0036 do Clube). Idempotente. SEM tabela/coluna nova
-- (mission_claims.period_key já é text — aceita a cadência mensal `m:YYYY-MM`).
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'studio_submitted';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'course_rated';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'room_item_buy';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'avatar_part_buy';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'mural_comment';
