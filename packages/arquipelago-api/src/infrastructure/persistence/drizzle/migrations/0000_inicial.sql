CREATE SCHEMA "arquipelago";
--> statement-breakpoint
CREATE TABLE "arquipelago"."limites_da_familia" (
	"conta_id" uuid PRIMARY KEY NOT NULL,
	"minutos" integer NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "limites_da_familia_minutos_check" CHECK ("arquipelago"."limites_da_familia"."minutos" between 10 and 240)
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."salvamentos" (
	"jogador_id" uuid PRIMARY KEY NOT NULL,
	"publico" varchar(8) NOT NULL,
	"revisao" integer NOT NULL,
	"dados" jsonb NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "salvamentos_publico_check" CHECK ("arquipelago"."salvamentos"."publico" in ('kids', 'adulto')),
	CONSTRAINT "salvamentos_revisao_check" CHECK ("arquipelago"."salvamentos"."revisao" >= 1)
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."tempo_diario" (
	"jogador_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"segundos" integer NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "tempo_diario_jogador_id_dia_pk" PRIMARY KEY("jogador_id","dia"),
	CONSTRAINT "tempo_diario_segundos_check" CHECK ("arquipelago"."tempo_diario"."segundos" between 0 and 86400)
);
