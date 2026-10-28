CREATE TABLE "arquipelago"."perfis_da_conta" (
	"jogador_id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."permissoes_da_familia" (
	"conta_id" uuid PRIMARY KEY NOT NULL,
	"visitas_de_irmaos" boolean NOT NULL,
	"visitas_de_outras_criancas" boolean NOT NULL,
	"fotos_no_clube" boolean NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "perfis_da_conta_conta_idx" ON "arquipelago"."perfis_da_conta" USING btree ("conta_id");