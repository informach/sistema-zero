CREATE TABLE "members"."cenario_perfis_publicados" (
	"perfil" text NOT NULL,
	"ilha" text NOT NULL,
	"publicacao_id" uuid NOT NULL,
	CONSTRAINT "cenario_perfis_publicados_perfil_ilha_pk" PRIMARY KEY("perfil","ilha")
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_publicacao_arquivos" (
	"publicacao_id" uuid NOT NULL,
	"espaco_id" uuid NOT NULL,
	"digest" varchar(64) NOT NULL,
	"bytes" integer NOT NULL,
	"mime" varchar(80) NOT NULL,
	"papel" text NOT NULL,
	CONSTRAINT "cenario_publicacao_arquivos_publicacao_id_digest_pk" PRIMARY KEY("publicacao_id","digest"),
	CONSTRAINT "cenario_publicacao_arquivos_bytes_check" CHECK ("members"."cenario_publicacao_arquivos"."bytes" between 1 and 268435456),
	CONSTRAINT "cenario_publicacao_arquivos_tipo_check" CHECK (("members"."cenario_publicacao_arquivos"."papel" = 'manifesto' and "members"."cenario_publicacao_arquivos"."mime" = 'application/vnd.sistemazero.cena-compilada+json') or ("members"."cenario_publicacao_arquivos"."papel" = 'recurso' and "members"."cenario_publicacao_arquivos"."mime" in ('model/gltf-binary', 'image/png', 'image/webp', 'application/octet-stream')))
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_publicacoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"espaco_id" uuid NOT NULL,
	"perfil" text NOT NULL,
	"ilha" text NOT NULL,
	"versao" integer NOT NULL,
	"fonte_cenario_id" uuid NOT NULL,
	"fonte_revisao" integer NOT NULL,
	"fonte_digest" varchar(64) NOT NULL,
	"manifesto_digest" varchar(64) NOT NULL,
	"manifesto_bytes" integer NOT NULL,
	"operacao_id" uuid NOT NULL,
	"digest_da_operacao" varchar(64) NOT NULL,
	"autor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_publicacoes_espaco_uq" UNIQUE("id","espaco_id"),
	CONSTRAINT "cenario_publicacoes_destino_uq" UNIQUE("id","perfil","ilha"),
	CONSTRAINT "cenario_publicacoes_perfil_check" CHECK ("members"."cenario_publicacoes"."perfil" = 'arquipelago-v2' and "members"."cenario_publicacoes"."ilha" in ('sua-ilha', 'bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens')),
	CONSTRAINT "cenario_publicacoes_versao_check" CHECK ("members"."cenario_publicacoes"."versao" > 0 and "members"."cenario_publicacoes"."fonte_revisao" >= 0),
	CONSTRAINT "cenario_publicacoes_digest_check" CHECK ("members"."cenario_publicacoes"."fonte_digest" ~ '^[a-f0-9]{64}$' and "members"."cenario_publicacoes"."manifesto_digest" ~ '^[a-f0-9]{64}$' and "members"."cenario_publicacoes"."digest_da_operacao" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "cenario_publicacoes_manifesto_bytes_check" CHECK ("members"."cenario_publicacoes"."manifesto_bytes" between 1 and 16777216)
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" DROP CONSTRAINT "cenario_blobs_tipo_check";--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" DROP CONSTRAINT "cenario_blobs_conteudo_check";--> statement-breakpoint
ALTER TABLE "members"."cenario_perfis_publicados" ADD CONSTRAINT "cenario_perfis_publicados_destino_fk" FOREIGN KEY ("publicacao_id","perfil","ilha") REFERENCES "members"."cenario_publicacoes"("id","perfil","ilha") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_publicacao_arquivos" ADD CONSTRAINT "cenario_publicacao_arquivos_versao_fk" FOREIGN KEY ("publicacao_id","espaco_id") REFERENCES "members"."cenario_publicacoes"("id","espaco_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_publicacao_arquivos" ADD CONSTRAINT "cenario_publicacao_arquivos_blob_fk" FOREIGN KEY ("espaco_id","digest") REFERENCES "members"."cenario_blobs"("espaco_id","digest") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_publicacoes" ADD CONSTRAINT "cenario_publicacoes_espaco_id_cenario_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "members"."cenario_espacos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_publicacoes" ADD CONSTRAINT "cenario_publicacoes_manifesto_fk" FOREIGN KEY ("espaco_id","manifesto_digest") REFERENCES "members"."cenario_blobs"("espaco_id","digest") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_publicacao_arquivos_blob_idx" ON "members"."cenario_publicacao_arquivos" USING btree ("espaco_id","digest");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_publicacoes_operacao_uq" ON "members"."cenario_publicacoes" USING btree ("operacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_publicacoes_versao_uq" ON "members"."cenario_publicacoes" USING btree ("perfil","ilha","versao");--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_compilado_mime_check" CHECK ("members"."cenario_blobs"."tipo" not in ('manifesto-compilado', 'recurso-compilado') or "members"."cenario_blobs"."tipo_do_conteudo" is not null);--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_compilado_bytes_check" CHECK (("members"."cenario_blobs"."tipo" <> 'manifesto-compilado' or "members"."cenario_blobs"."bytes" <= 16777216) and ("members"."cenario_blobs"."tipo" <> 'recurso-compilado' or "members"."cenario_blobs"."bytes" <= 268435456));--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_tipo_check" CHECK ("members"."cenario_blobs"."tipo" in ('modelo', 'miniatura', 'capa', 'textura', 'terreno', 'manifesto-compilado', 'recurso-compilado'));--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_conteudo_check" CHECK (("members"."cenario_blobs"."tipo_do_conteudo" is null and "members"."cenario_blobs"."tipo" not in ('manifesto-compilado', 'recurso-compilado')) or ("members"."cenario_blobs"."tipo" = 'modelo' and "members"."cenario_blobs"."tipo_do_conteudo" = 'model/gltf-binary') or ("members"."cenario_blobs"."tipo" in ('miniatura', 'capa', 'textura') and "members"."cenario_blobs"."tipo_do_conteudo" in ('image/webp', 'image/png')) or ("members"."cenario_blobs"."tipo" = 'terreno' and "members"."cenario_blobs"."tipo_do_conteudo" = 'application/octet-stream') or ("members"."cenario_blobs"."tipo" = 'manifesto-compilado' and "members"."cenario_blobs"."tipo_do_conteudo" = 'application/vnd.sistemazero.cena-compilada+json') or ("members"."cenario_blobs"."tipo" = 'recurso-compilado' and "members"."cenario_blobs"."tipo_do_conteudo" in ('model/gltf-binary', 'image/webp', 'image/png', 'application/octet-stream')));