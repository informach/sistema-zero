ALTER TABLE "funil"."funnel_events" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "gasto_terceiros";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "forma_de_criar";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "nivel_refem";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "peso_principal";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "visualizacao";--> statement-breakpoint
ALTER TABLE "funil"."leads" DROP COLUMN "o_que_falta";