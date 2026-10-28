CREATE TABLE "arquipelago"."controle_de_tempo" (
	"jogador_id" uuid PRIMARY KEY NOT NULL,
	"sessao_atual" uuid
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."sessoes_de_tempo" (
	"jogador_id" uuid NOT NULL,
	"sessao_id" uuid NOT NULL,
	"cursor" timestamp with time zone NOT NULL,
	"vencimento" timestamp with time zone NOT NULL,
	"estado" varchar(12) NOT NULL,
	"ultima_sequencia" integer NOT NULL,
	"ultima_acao" varchar(12) NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "sessoes_de_tempo_jogador_id_sessao_id_pk" PRIMARY KEY("jogador_id","sessao_id"),
	CONSTRAINT "sessoes_de_tempo_estado_check" CHECK ("arquipelago"."sessoes_de_tempo"."estado" in ('ativa', 'encerrada', 'expirada')),
	CONSTRAINT "sessoes_de_tempo_sequencia_check" CHECK ("arquipelago"."sessoes_de_tempo"."ultima_sequencia" >= 0),
	CONSTRAINT "sessoes_de_tempo_acao_check" CHECK ("arquipelago"."sessoes_de_tempo"."ultima_acao" in ('iniciar', 'pulsar', 'pausar'))
);
