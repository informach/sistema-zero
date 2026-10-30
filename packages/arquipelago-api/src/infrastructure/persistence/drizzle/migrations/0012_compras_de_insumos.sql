CREATE TABLE "arquipelago"."compras_de_insumos" (
	"chave" uuid PRIMARY KEY NOT NULL,
	"jogador_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"versao" integer NOT NULL,
	"revisao_base" integer NOT NULL,
	"item" varchar(40) NOT NULL,
	"quantidade" smallint NOT NULL,
	"moedas" smallint NOT NULL,
	"situacao" varchar(20) NOT NULL,
	"saldo" integer,
	"criada_em" timestamp with time zone NOT NULL,
	"concluida_em" timestamp with time zone,
	CONSTRAINT "compras_de_insumos_publico" CHECK ("arquipelago"."compras_de_insumos"."publico" in ('kids','adulto')),
	CONSTRAINT "compras_de_insumos_valores" CHECK ("arquipelago"."compras_de_insumos"."versao" = 1 and "arquipelago"."compras_de_insumos"."revisao_base" between 1 and 2147483646 and "arquipelago"."compras_de_insumos"."quantidade" between 1 and 10 and "arquipelago"."compras_de_insumos"."moedas" between 1 and 30),
	CONSTRAINT "compras_de_insumos_estado" CHECK (("arquipelago"."compras_de_insumos"."situacao" = 'pendente' and "arquipelago"."compras_de_insumos"."concluida_em" is null and "arquipelago"."compras_de_insumos"."saldo" is null) or ("arquipelago"."compras_de_insumos"."situacao" = 'entregue' and "arquipelago"."compras_de_insumos"."concluida_em" is not null and "arquipelago"."compras_de_insumos"."saldo" is not null and "arquipelago"."compras_de_insumos"."saldo" >= 0) or ("arquipelago"."compras_de_insumos"."situacao" in ('saldo-insuficiente','recusada') and "arquipelago"."compras_de_insumos"."concluida_em" is not null and "arquipelago"."compras_de_insumos"."saldo" is null))
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."compras_de_insumos" ADD CONSTRAINT "compras_de_insumos_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compras_de_insumos_pendente" ON "arquipelago"."compras_de_insumos" USING btree ("jogador_id") WHERE "arquipelago"."compras_de_insumos"."situacao" = 'pendente';--> statement-breakpoint
CREATE INDEX "compras_de_insumos_jogador" ON "arquipelago"."compras_de_insumos" USING btree ("jogador_id","publico","criada_em");