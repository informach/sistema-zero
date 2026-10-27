CREATE TABLE "arquipelago"."desafio_progresso" (
	"jogador_id" uuid NOT NULL,
	"desafio_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"ultimos_resultados" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "desafio_progresso_jogador_id_desafio_id_pk" PRIMARY KEY("jogador_id","desafio_id")
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."desafio_publicacoes" (
	"desafio_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"conteudo" jsonb NOT NULL,
	"blocos_derivados" text[] NOT NULL,
	"blocos_exigidos" text[] NOT NULL,
	"vista" jsonb NOT NULL,
	"analise" jsonb NOT NULL,
	"publicado_em" timestamp with time zone NOT NULL,
	"publicado_por" uuid NOT NULL,
	CONSTRAINT "desafio_publicacoes_desafio_id_revisao_pk" PRIMARY KEY("desafio_id","revisao")
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."desafios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"publico" varchar(8) NOT NULL,
	"ilha" varchar(40) NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"quadro" smallint,
	"ordem" integer NOT NULL,
	"situacao" varchar(12) NOT NULL,
	"revisao" integer NOT NULL,
	"revisao_publicada" integer,
	"conteudo" jsonb NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"atualizado_por" uuid NOT NULL,
	CONSTRAINT "desafios_publico_check" CHECK ("arquipelago"."desafios"."publico" in ('kids', 'adulto')),
	CONSTRAINT "desafios_tipo_check" CHECK ("arquipelago"."desafios"."tipo" in ('quadro-das-cores', 'desafio-do-dia', 'pedido-de-morador')),
	CONSTRAINT "desafios_situacao_check" CHECK ("arquipelago"."desafios"."situacao" in ('rascunho', 'publicado', 'arquivado')),
	CONSTRAINT "desafios_quadro_check" CHECK (("arquipelago"."desafios"."tipo" = 'quadro-das-cores') = ("arquipelago"."desafios"."quadro" is not null) and ("arquipelago"."desafios"."quadro" is null or "arquipelago"."desafios"."quadro" between 1 and 6)),
	CONSTRAINT "desafios_revisao_check" CHECK ("arquipelago"."desafios"."revisao" >= 1)
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."desafios_concluidos" (
	"jogador_id" uuid NOT NULL,
	"desafio_id" uuid NOT NULL,
	"publico" varchar(8) NOT NULL,
	"revisao" integer NOT NULL,
	"concluido_em" timestamp with time zone NOT NULL,
	"extra_concluido_em" timestamp with time zone,
	"recompensa_vista_em" timestamp with time zone,
	"moedas" integer NOT NULL,
	"moedas_situacao" varchar(12) NOT NULL,
	"moedas_extra" integer NOT NULL,
	"moedas_extra_situacao" varchar(12) NOT NULL,
	"moedas_teto_semana" varchar(10),
	"moedas_extra_teto_semana" varchar(10),
	CONSTRAINT "desafios_concluidos_jogador_id_desafio_id_pk" PRIMARY KEY("jogador_id","desafio_id"),
	CONSTRAINT "desafios_concluidos_publico_check" CHECK ("arquipelago"."desafios_concluidos"."publico" in ('kids', 'adulto')),
	CONSTRAINT "desafios_concluidos_moedas_check" CHECK ("arquipelago"."desafios_concluidos"."moedas_situacao" in ('nenhuma', 'pendente', 'creditado', 'teto') and "arquipelago"."desafios_concluidos"."moedas_extra_situacao" in ('nenhuma', 'pendente', 'creditado', 'teto'))
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."desafio_progresso" ADD CONSTRAINT "desafio_progresso_desafio_id_desafios_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "arquipelago"."desafios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."desafio_publicacoes" ADD CONSTRAINT "desafio_publicacoes_desafio_id_desafios_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "arquipelago"."desafios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."desafios_concluidos" ADD CONSTRAINT "desafios_concluidos_desafio_id_desafios_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "arquipelago"."desafios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "desafios_slug_unico" ON "arquipelago"."desafios" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "desafios_quadro_unico" ON "arquipelago"."desafios" USING btree ("publico","ilha","quadro") WHERE "arquipelago"."desafios"."tipo" = 'quadro-das-cores' and "arquipelago"."desafios"."situacao" <> 'arquivado';--> statement-breakpoint
CREATE INDEX "desafios_lista" ON "arquipelago"."desafios" USING btree ("publico","ilha","ordem");--> statement-breakpoint
CREATE INDEX "desafios_concluidos_jogador" ON "arquipelago"."desafios_concluidos" USING btree ("jogador_id");