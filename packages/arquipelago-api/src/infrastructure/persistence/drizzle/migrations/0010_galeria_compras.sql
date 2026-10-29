CREATE TABLE "arquipelago"."compras_da_galeria" (
	"jogador_id" uuid NOT NULL,
	"aparencia_id" varchar(80) NOT NULL,
	"objeto" varchar(20) NOT NULL,
	"moedas" integer NOT NULL,
	"chave" uuid NOT NULL,
	"situacao" varchar(10) NOT NULL,
	"criada_em" timestamp with time zone NOT NULL,
	"paga_em" timestamp with time zone,
	CONSTRAINT "compras_da_galeria_jogador_id_aparencia_id_pk" PRIMARY KEY("jogador_id","aparencia_id"),
	CONSTRAINT "compras_da_galeria_situacao_check" CHECK ("arquipelago"."compras_da_galeria"."situacao" in ('pendente', 'paga')),
	CONSTRAINT "compras_da_galeria_moedas_check" CHECK ("arquipelago"."compras_da_galeria"."moedas" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "compras_da_galeria_chave_idx" ON "arquipelago"."compras_da_galeria" USING btree ("chave");