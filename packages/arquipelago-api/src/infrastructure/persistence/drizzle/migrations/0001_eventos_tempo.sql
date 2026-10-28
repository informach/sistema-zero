CREATE TABLE "arquipelago"."eventos_tempo" (
	"jogador_id" uuid NOT NULL,
	"evento_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"segundos" integer NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "eventos_tempo_jogador_id_evento_id_pk" PRIMARY KEY("jogador_id","evento_id"),
	CONSTRAINT "eventos_tempo_segundos_check" CHECK ("arquipelago"."eventos_tempo"."segundos" between 1 and 120)
);
