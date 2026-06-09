ALTER TABLE "funil"."leads" ADD COLUMN "tipo_criar" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "relacao_ia" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "trava_principal" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "custo_principal" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "proximo_passo" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "sintese" text;--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "perfil_resultado" text;--> statement-breakpoint
CREATE INDEX "leads_perfil_idx" ON "funil"."leads" USING btree ("perfil_resultado");