ALTER TABLE "arquipelago"."desafio_progresso" ADD COLUMN "tentativas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "arquipelago"."desafio_progresso" ADD COLUMN "dicas" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "arquipelago"."desafios_concluidos" ADD COLUMN "tentativas" integer;--> statement-breakpoint
ALTER TABLE "arquipelago"."desafios_concluidos" ADD COLUMN "dicas" smallint;--> statement-breakpoint
ALTER TABLE "arquipelago"."minijogos" ADD COLUMN "envios" integer DEFAULT 1 NOT NULL;