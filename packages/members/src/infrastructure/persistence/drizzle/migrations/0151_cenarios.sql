CREATE TABLE "members"."cenario_bibliotecas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"espaco_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"licenca" text NOT NULL,
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_bibliotecas_licenca_check" CHECK ("members"."cenario_bibliotecas"."licenca" in ('livre', 'propria', 'restrita'))
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_blobs" (
	"espaco_id" uuid NOT NULL,
	"digest" varchar(64) NOT NULL,
	"tipo" text NOT NULL,
	"bytes" integer NOT NULL,
	"confirmado_em" timestamp with time zone,
	"vence_em" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_blobs_espaco_id_digest_pk" PRIMARY KEY("espaco_id","digest"),
	CONSTRAINT "cenario_blobs_tipo_check" CHECK ("members"."cenario_blobs"."tipo" in ('modelo', 'miniatura', 'capa')),
	CONSTRAINT "cenario_blobs_digest_check" CHECK ("members"."cenario_blobs"."digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "cenario_blobs_bytes_check" CHECK ("members"."cenario_blobs"."bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_cenarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mundo_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"revisao" integer DEFAULT 0 NOT NULL,
	"documento" jsonb NOT NULL,
	"capa" varchar(64),
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_espacos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"conta_id" uuid,
	"limite_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_espacos_tipo_check" CHECK (("members"."cenario_espacos"."tipo" = 'conta' and "members"."cenario_espacos"."conta_id" is not null) or ("members"."cenario_espacos"."tipo" = 'equipe' and "members"."cenario_espacos"."conta_id" is null))
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_lotes" (
	"cenario_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"operacao_id" varchar(80) NOT NULL,
	"comandos" jsonb NOT NULL,
	"autor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_lotes_cenario_id_revisao_pk" PRIMARY KEY("cenario_id","revisao")
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_modelos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"biblioteca_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"pasta" varchar(240) DEFAULT '' NOT NULL,
	"etiquetas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"busca" varchar(600) NOT NULL,
	"digest" varchar(64) NOT NULL,
	"bytes" integer NOT NULL,
	"triangulos" integer NOT NULL,
	"caixa" jsonb NOT NULL,
	"miniatura" varchar(64),
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_mundo_bibliotecas" (
	"mundo_id" uuid NOT NULL,
	"biblioteca_id" uuid NOT NULL,
	CONSTRAINT "cenario_mundo_bibliotecas_mundo_id_biblioteca_id_pk" PRIMARY KEY("mundo_id","biblioteca_id")
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_mundos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"espaco_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_bibliotecas" ADD CONSTRAINT "cenario_bibliotecas_espaco_id_cenario_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "members"."cenario_espacos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_espaco_id_cenario_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "members"."cenario_espacos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_cenarios" ADD CONSTRAINT "cenario_cenarios_mundo_id_cenario_mundos_id_fk" FOREIGN KEY ("mundo_id") REFERENCES "members"."cenario_mundos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_lotes" ADD CONSTRAINT "cenario_lotes_cenario_id_cenario_cenarios_id_fk" FOREIGN KEY ("cenario_id") REFERENCES "members"."cenario_cenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_modelos" ADD CONSTRAINT "cenario_modelos_biblioteca_id_cenario_bibliotecas_id_fk" FOREIGN KEY ("biblioteca_id") REFERENCES "members"."cenario_bibliotecas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_mundo_bibliotecas" ADD CONSTRAINT "cenario_mundo_bibliotecas_mundo_id_cenario_mundos_id_fk" FOREIGN KEY ("mundo_id") REFERENCES "members"."cenario_mundos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_mundo_bibliotecas" ADD CONSTRAINT "cenario_mundo_bibliotecas_biblioteca_id_cenario_bibliotecas_id_fk" FOREIGN KEY ("biblioteca_id") REFERENCES "members"."cenario_bibliotecas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_mundos" ADD CONSTRAINT "cenario_mundos_espaco_id_cenario_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "members"."cenario_espacos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_bibliotecas_espaco_idx" ON "members"."cenario_bibliotecas" USING btree ("espaco_id");--> statement-breakpoint
CREATE INDEX "cenario_cenarios_mundo_idx" ON "members"."cenario_cenarios" USING btree ("mundo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_espacos_conta_uq" ON "members"."cenario_espacos" USING btree ("conta_id") WHERE "members"."cenario_espacos"."tipo" = 'conta';--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_espacos_equipe_uq" ON "members"."cenario_espacos" USING btree ("tipo") WHERE "members"."cenario_espacos"."tipo" = 'equipe';--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_lotes_operacao_uq" ON "members"."cenario_lotes" USING btree ("cenario_id","operacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_modelos_biblioteca_digest_uq" ON "members"."cenario_modelos" USING btree ("biblioteca_id","digest");--> statement-breakpoint
CREATE INDEX "cenario_modelos_lista_idx" ON "members"."cenario_modelos" USING btree ("biblioteca_id","nome","id");--> statement-breakpoint
CREATE INDEX "cenario_modelos_digest_idx" ON "members"."cenario_modelos" USING btree ("digest");--> statement-breakpoint
CREATE INDEX "cenario_mundo_bibliotecas_biblioteca_idx" ON "members"."cenario_mundo_bibliotecas" USING btree ("biblioteca_id");--> statement-breakpoint
CREATE INDEX "cenario_mundos_espaco_idx" ON "members"."cenario_mundos" USING btree ("espaco_id");