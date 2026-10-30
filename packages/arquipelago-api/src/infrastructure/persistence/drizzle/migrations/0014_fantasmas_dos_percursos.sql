CREATE TABLE "arquipelago"."fantasmas" (
	"jogador_id" uuid NOT NULL,
	"percurso" varchar(40) NOT NULL,
	"publico" varchar(8) NOT NULL,
	"dados" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "fantasmas_jogador_id_percurso_pk" PRIMARY KEY("jogador_id","percurso"),
	CONSTRAINT "fantasmas_publico_check" CHECK ("arquipelago"."fantasmas"."publico" in ('kids', 'adulto')),
	CONSTRAINT "fantasmas_percurso_check" CHECK ("arquipelago"."fantasmas"."percurso" in ('bosque-copas', 'vila-telhados', 'pico-cume', 'nuvens-saltos', 'nuvens-balao')),
	CONSTRAINT "fantasmas_tamanho_check" CHECK (octet_length("arquipelago"."fantasmas"."dados"::text) <= 131072),
	CONSTRAINT "fantasmas_versao_check" CHECK ("arquipelago"."fantasmas"."dados"->>'versao' = '1' and "arquipelago"."fantasmas"."dados"->>'percurso' = "arquipelago"."fantasmas"."percurso")
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."fantasmas" ADD CONSTRAINT "fantasmas_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;