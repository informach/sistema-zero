-- Retenção pós-cursos do Estúdio (07/2026): publicar jogo standalone no Mural vira
-- fonte de gamificação — marco por publicação (missões gated por estudio-completo),
-- XP diário de publicar (1×/dia, move streak/liga de quem só cria), marco de remix e
-- marcos de jogadas recebidas (badges plays-10/plays-100 + troféu). Espelha a 0037.
-- Idempotente. SEM tabela/coluna nova.
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'studio_published';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'studio_publish_day';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'studio_remix';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'play_milestone_10';--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE IF NOT EXISTS 'play_milestone_100';--> statement-breakpoint
ALTER TYPE "members"."coin_source_type" ADD VALUE IF NOT EXISTS 'studio_publish_day';
