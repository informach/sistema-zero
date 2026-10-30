CREATE TABLE "arquipelago"."pedidos_remunerados" (
	"chave" uuid PRIMARY KEY NOT NULL,
	"pagamento_id" uuid NOT NULL,
	"jogador_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"versao" integer NOT NULL,
	"revisao_base" integer NOT NULL,
	"morador" varchar(12) NOT NULL,
	"dia" date NOT NULL,
	"pedido" varchar(40) NOT NULL,
	"moedas" smallint NOT NULL,
	"pagamento" varchar(12) NOT NULL,
	"entregue_em" timestamp with time zone NOT NULL,
	CONSTRAINT "pedidos_remunerados_pagamentoId_unique" UNIQUE("pagamento_id"),
	CONSTRAINT "pedidos_remunerados_publico" CHECK ("arquipelago"."pedidos_remunerados"."publico" in ('kids','adulto')),
	CONSTRAINT "pedidos_remunerados_morador" CHECK ("arquipelago"."pedidos_remunerados"."morador" in ('capi','bento','mare','floco','jade','irie')),
	CONSTRAINT "pedidos_remunerados_valores" CHECK ("arquipelago"."pedidos_remunerados"."versao" = 1 and "arquipelago"."pedidos_remunerados"."revisao_base" between 1 and 2147483646 and "arquipelago"."pedidos_remunerados"."moedas" in (3,4)),
	CONSTRAINT "pedidos_remunerados_pagamento" CHECK ("arquipelago"."pedidos_remunerados"."pagamento" in ('pendente','creditado','teto','recusado'))
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."pedidos_remunerados" ADD CONSTRAINT "pedidos_remunerados_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_remunerados_dia" ON "arquipelago"."pedidos_remunerados" USING btree ("jogador_id","publico","morador","dia");--> statement-breakpoint
CREATE INDEX "pedidos_remunerados_pendente" ON "arquipelago"."pedidos_remunerados" USING btree ("jogador_id","publico","entregue_em") WHERE "arquipelago"."pedidos_remunerados"."pagamento" = 'pendente';