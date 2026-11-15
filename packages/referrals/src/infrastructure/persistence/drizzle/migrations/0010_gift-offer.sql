-- Presente por oferta do catálogo (15/11/2026). Escrita à mão e idempotente: só colunas novas,
-- nulas e sem DEFAULT (nenhuma reescrita de tabela). `access_duration_days` já aceita NULL
-- (0002) e `mural_visitor_policy` é varchar(16) sem CHECK (0003), então o valor 'offer' não
-- pede alteração de restrição.
ALTER TABLE "referrals"."campaigns" ADD COLUMN IF NOT EXISTS "gift_offer_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN IF NOT EXISTS "gift_offer_id" uuid;
