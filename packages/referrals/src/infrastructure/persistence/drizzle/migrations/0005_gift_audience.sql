-- Presente Kids e adulto (20/10/2026). Gerada pelo drizzle-kit e reordenada à mão para ser
-- segura sobre dados existentes: colunas novas nascem com DEFAULT constante (sem reescrita),
-- o backfill de `codes` roda antes do NOT NULL e os UNIQUEs novos são criados antes de soltar
-- os antigos (os dados já satisfazem os novos, que são mais largos).
-- `codes.panel_audience` (criada na 0000, nunca escrita) passa a ser o público do código e
-- mantém o nome físico: renomear quebraria o SELECT do container antigo durante o deploy.
ALTER TABLE "referrals"."campaigns" ADD COLUMN "audience" varchar(16) DEFAULT 'kids' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "audience" varchar(16) DEFAULT 'kids' NOT NULL;--> statement-breakpoint
UPDATE "referrals"."codes" SET "panel_audience" = 'kids';--> statement-breakpoint
ALTER TABLE "referrals"."codes" ALTER COLUMN "panel_audience" SET DEFAULT 'kids';--> statement-breakpoint
ALTER TABLE "referrals"."codes" ALTER COLUMN "panel_audience" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "codes_ambassador_audience_uq" ON "referrals"."codes" USING btree ("ambassador_id","panel_audience") WHERE ambassador_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "scholarship_redemptions_email_audience_uq" ON "referrals"."scholarship_redemptions" USING btree ("email","audience");--> statement-breakpoint
DROP INDEX "referrals"."codes_ambassador_uq";--> statement-breakpoint
DROP INDEX "referrals"."scholarship_redemptions_email_uq";--> statement-breakpoint
ALTER TABLE "referrals"."campaigns" ADD CONSTRAINT "campaigns_audience_check" CHECK ("referrals"."campaigns"."audience" in ('kids','adult'));--> statement-breakpoint
ALTER TABLE "referrals"."codes" ADD CONSTRAINT "codes_audience_check" CHECK ("referrals"."codes"."panel_audience" in ('kids','adult'));--> statement-breakpoint
ALTER TABLE "referrals"."scholarship_redemptions" ADD CONSTRAINT "scholarship_redemptions_audience_check" CHECK ("referrals"."scholarship_redemptions"."audience" in ('kids','adult'));
