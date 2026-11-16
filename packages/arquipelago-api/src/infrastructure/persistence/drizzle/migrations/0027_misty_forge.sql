CREATE TABLE "arquipelago"."cenario_projetos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(120) NOT NULL,
	"revisao" integer DEFAULT 0 NOT NULL,
	"revisao_aplicada" integer,
	"atualizado_em" timestamp with time zone NOT NULL,
	"autor_id" uuid NOT NULL,
	CONSTRAINT "cenario_projetos_revisao_check" CHECK ("arquipelago"."cenario_projetos"."revisao" >= 0)
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."cenario_revisoes" (
	"projeto_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"documento" jsonb NOT NULL,
	"autor_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"operacao_id" uuid NOT NULL,
	"impressao" varchar(64) NOT NULL,
	CONSTRAINT "cenario_revisoes_projeto_id_revisao_pk" PRIMARY KEY("projeto_id","revisao"),
	CONSTRAINT "cenario_revisoes_revisao_check" CHECK ("arquipelago"."cenario_revisoes"."revisao" >= 0)
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."cenario_revisoes" ADD CONSTRAINT "cenario_revisoes_projeto_id_cenario_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "arquipelago"."cenario_projetos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_projetos_atualizado_idx" ON "arquipelago"."cenario_projetos" USING btree ("atualizado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_revisoes_operacao_idx" ON "arquipelago"."cenario_revisoes" USING btree ("projeto_id","operacao_id");