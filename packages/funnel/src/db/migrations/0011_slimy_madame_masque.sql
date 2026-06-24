DROP INDEX "funil"."leads_segmento_idx";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "segmento";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "tipo_criar";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "relacao_ia";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "ja_quebrou";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "trava_principal";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "custo_principal";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "horas_retrabalho";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "valor_hora";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "custo_mensal";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "mudanca_desejada";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "proximo_passo";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "sintese";