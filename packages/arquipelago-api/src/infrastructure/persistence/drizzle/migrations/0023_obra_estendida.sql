CREATE TABLE "arquipelago"."obras_estendidas" (
	"jogador_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"revisao" integer NOT NULL,
	"documento" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "obras_estendidas_jogador_id_publico_pk" PRIMARY KEY("jogador_id","publico"),
	CONSTRAINT "obras_estendidas_publico_check" CHECK ("arquipelago"."obras_estendidas"."publico" in ('kids', 'adulto')),
	CONSTRAINT "obras_estendidas_revisao_check" CHECK ("arquipelago"."obras_estendidas"."revisao" >= 1),
	CONSTRAINT "obras_estendidas_tamanho_check" CHECK (octet_length("arquipelago"."obras_estendidas"."documento"::text) <= 65536),
	CONSTRAINT "obras_estendidas_versao_check" CHECK ("arquipelago"."obras_estendidas"."documento"->>'versao' = '1')
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."fantasmas" DROP CONSTRAINT "fantasmas_percurso_check";--> statement-breakpoint
ALTER TABLE "arquipelago"."obras_estendidas" ADD CONSTRAINT "obras_estendidas_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."fantasmas" ADD CONSTRAINT "fantasmas_percurso_check" CHECK ("arquipelago"."fantasmas"."percurso" in ('bosque-copas', 'vila-telhados', 'pico-cume', 'nuvens-saltos', 'nuvens-balao', 'praia-pedras', 'recife-corais', 'vale-pegadas', 'farol-subida'));