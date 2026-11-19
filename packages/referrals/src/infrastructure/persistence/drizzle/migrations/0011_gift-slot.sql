-- Curso para pais não ocupa a vaga do presente Kids (18/11/2026). Escrita à mão e idempotente.
-- `gift_slot`: 'main' = o presente do público (um por e-mail e público, a regra de sempre);
-- 'parents:<slug>' = curso para pais, um por curso. Todos os resgates existentes ficam em 'main'
-- (DEFAULT constante: sem reescrita de tabela no Postgres 11+).
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN IF NOT EXISTS "gift_slot" varchar(160) DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" DROP CONSTRAINT IF EXISTS "scholarship_redemptions_gift_slot_check";--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD CONSTRAINT "scholarship_redemptions_gift_slot_check" CHECK ("gift_slot" = 'main' or "gift_slot" like 'parents:%');--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scholarship_redemptions_email_audience_slot_uq" ON "referrals"."scholarship_redemptions" USING btree ("email","audience","gift_slot");--> statement-breakpoint
DROP INDEX IF EXISTS "referrals"."scholarship_redemptions_email_audience_uq";
