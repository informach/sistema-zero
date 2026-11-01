-- Lacunas (01/11/2026): a fila da revisão humana da Lenda e, junto, a trava dos percursos dos
-- fantasmas com os três percursos do L3 (trenó, montaria e regata), que entraram no contrato sem
-- migration: sem ela, gravar o fantasma desses percursos esbarrava na trava do banco.
CREATE TABLE "arquipelago"."revisoes_humanas" (
	"jogador_id" uuid NOT NULL,
	"desafio_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"estado" varchar(16) NOT NULL,
	"envio" integer DEFAULT 1 NOT NULL,
	"enviado_em" timestamp with time zone NOT NULL,
	"retorno" text,
	"revisado_por" uuid,
	"revisado_em" timestamp with time zone,
	CONSTRAINT "revisoes_humanas_jogador_id_desafio_id_pk" PRIMARY KEY("jogador_id","desafio_id"),
	CONSTRAINT "revisoes_humanas_publico_check" CHECK ("arquipelago"."revisoes_humanas"."publico" in ('kids', 'adulto')),
	CONSTRAINT "revisoes_humanas_estado_check" CHECK ("arquipelago"."revisoes_humanas"."estado" in ('aguardando', 'conferido', 'nova-tentativa')),
	CONSTRAINT "revisoes_humanas_retorno_check" CHECK (length("arquipelago"."revisoes_humanas"."retorno") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."fantasmas" DROP CONSTRAINT "fantasmas_percurso_check";--> statement-breakpoint
ALTER TABLE "arquipelago"."revisoes_humanas" ADD CONSTRAINT "revisoes_humanas_desafio_id_desafios_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "arquipelago"."desafios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisoes_humanas_fila" ON "arquipelago"."revisoes_humanas" USING btree ("estado","enviado_em");--> statement-breakpoint
ALTER TABLE "arquipelago"."fantasmas" ADD CONSTRAINT "fantasmas_percurso_check" CHECK ("arquipelago"."fantasmas"."percurso" in ('bosque-copas', 'vila-telhados', 'pico-cume', 'nuvens-saltos', 'nuvens-balao', 'praia-pedras', 'recife-corais', 'vale-pegadas', 'farol-subida', 'pico-treno', 'vale-montaria', 'barco-regata'));