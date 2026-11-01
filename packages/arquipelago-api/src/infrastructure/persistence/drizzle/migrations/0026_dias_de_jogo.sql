CREATE TABLE "arquipelago"."dias_de_jogo" (
	"jogador_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"publico" varchar(8) NOT NULL,
	"primeiro_em" timestamp with time zone NOT NULL,
	"ultimo_em" timestamp with time zone NOT NULL,
	CONSTRAINT "dias_de_jogo_jogador_id_dia_pk" PRIMARY KEY("jogador_id","dia"),
	CONSTRAINT "dias_de_jogo_publico_check" CHECK ("arquipelago"."dias_de_jogo"."publico" in ('kids', 'adulto'))
);
--> statement-breakpoint
CREATE INDEX "dias_de_jogo_dia" ON "arquipelago"."dias_de_jogo" USING btree ("publico","dia");