CREATE TABLE "arquipelago"."cenario_aplicacoes" (
	"base" varchar(240) PRIMARY KEY NOT NULL,
	"projeto_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"autor_id" uuid NOT NULL,
	"aplicado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."cenario_sessoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"projeto_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"estado" jsonb NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."cenario_tarefas_viewport" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sessao_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"pedido" jsonb NOT NULL,
	"estado" varchar(16) NOT NULL,
	"resultado" jsonb,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."cenario_aplicacoes" ADD CONSTRAINT "cenario_aplicacoes_projeto_id_cenario_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "arquipelago"."cenario_projetos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."cenario_sessoes" ADD CONSTRAINT "cenario_sessoes_projeto_id_cenario_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "arquipelago"."cenario_projetos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."cenario_tarefas_viewport" ADD CONSTRAINT "cenario_tarefas_viewport_sessao_id_cenario_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "arquipelago"."cenario_sessoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_sessoes_expira_idx" ON "arquipelago"."cenario_sessoes" USING btree ("expira_em");--> statement-breakpoint
CREATE INDEX "cenario_tarefas_sessao_idx" ON "arquipelago"."cenario_tarefas_viewport" USING btree ("sessao_id","estado");--> statement-breakpoint
CREATE INDEX "cenario_tarefas_expira_idx" ON "arquipelago"."cenario_tarefas_viewport" USING btree ("expira_em");