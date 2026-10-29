CREATE TABLE "arquipelago"."minijogos" (
	"jogador_id" uuid NOT NULL,
	"desafio_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"projeto" text NOT NULL,
	"capa" text,
	"aprovado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "minijogos_jogador_id_desafio_id_pk" PRIMARY KEY("jogador_id","desafio_id"),
	CONSTRAINT "minijogos_publico_check" CHECK ("arquipelago"."minijogos"."publico" in ('kids', 'adulto')),
	CONSTRAINT "minijogos_tamanho_check" CHECK (length("arquipelago"."minijogos"."projeto") <= 1500000)
);
