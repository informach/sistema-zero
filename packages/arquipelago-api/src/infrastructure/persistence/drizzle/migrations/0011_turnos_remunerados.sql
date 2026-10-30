CREATE TABLE "arquipelago"."turnos_remunerados" (
	"id" uuid PRIMARY KEY NOT NULL,
	"jogador_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"posto" varchar(20) NOT NULL,
	"dia" date NOT NULL,
	"versao" integer NOT NULL,
	"moedas" integer NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"concluido_em" timestamp with time zone,
	"pagamento" varchar(12) NOT NULL,
	"teto_semana" date,
	CONSTRAINT "turnos_remunerados_publico" CHECK ("arquipelago"."turnos_remunerados"."publico" in ('kids','adulto')),
	CONSTRAINT "turnos_remunerados_posto" CHECK ("arquipelago"."turnos_remunerados"."posto" in ('padaria','sorveteria','sucos')),
	CONSTRAINT "turnos_remunerados_valores" CHECK ("arquipelago"."turnos_remunerados"."versao" = 1 and "arquipelago"."turnos_remunerados"."moedas" between 1 and 100),
	CONSTRAINT "turnos_remunerados_pagamento" CHECK (("arquipelago"."turnos_remunerados"."concluido_em" is null and "arquipelago"."turnos_remunerados"."pagamento" = 'aguardando' and "arquipelago"."turnos_remunerados"."teto_semana" is null) or ("arquipelago"."turnos_remunerados"."concluido_em" is not null and (("arquipelago"."turnos_remunerados"."pagamento" in ('pendente','creditado') and "arquipelago"."turnos_remunerados"."teto_semana" is null) or ("arquipelago"."turnos_remunerados"."pagamento" = 'teto' and "arquipelago"."turnos_remunerados"."teto_semana" is not null))))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "turnos_remunerados_dia" ON "arquipelago"."turnos_remunerados" USING btree ("jogador_id","publico","posto","dia");--> statement-breakpoint
CREATE INDEX "turnos_remunerados_pendentes" ON "arquipelago"."turnos_remunerados" USING btree ("jogador_id","publico","pagamento","criado_em");