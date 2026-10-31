CREATE TABLE "arquipelago"."vendas_na_feira" (
	"chave" uuid PRIMARY KEY NOT NULL,
	"pagamento_id" uuid NOT NULL,
	"jogador_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"versao" integer NOT NULL,
	"revisao_base" integer NOT NULL,
	"dia" date NOT NULL,
	"itens" jsonb NOT NULL,
	"moedas" smallint NOT NULL,
	"pagamento" varchar(12) NOT NULL,
	"vendida_em" timestamp with time zone NOT NULL,
	CONSTRAINT "vendas_na_feira_pagamentoId_unique" UNIQUE("pagamento_id"),
	CONSTRAINT "vendas_na_feira_publico" CHECK ("arquipelago"."vendas_na_feira"."publico" in ('kids','adulto')),
	CONSTRAINT "vendas_na_feira_valores" CHECK ("arquipelago"."vendas_na_feira"."versao" = 1 and "arquipelago"."vendas_na_feira"."revisao_base" between 1 and 2147483646 and "arquipelago"."vendas_na_feira"."moedas" between 1 and 10),
	CONSTRAINT "vendas_na_feira_pagamento" CHECK ("arquipelago"."vendas_na_feira"."pagamento" in ('pendente','creditado','teto','recusado'))
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."vendas_na_feira" ADD CONSTRAINT "vendas_na_feira_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendas_na_feira_dia" ON "arquipelago"."vendas_na_feira" USING btree ("jogador_id","publico","dia");--> statement-breakpoint
CREATE INDEX "vendas_na_feira_pendente" ON "arquipelago"."vendas_na_feira" USING btree ("jogador_id","publico","vendida_em") WHERE "arquipelago"."vendas_na_feira"."pagamento" = 'pendente';