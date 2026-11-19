CREATE TABLE "members"."cenario_texturas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"biblioteca_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"pasta" varchar(240) DEFAULT '' NOT NULL,
	"etiquetas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"busca" varchar(600) NOT NULL,
	"digest" varchar(64) NOT NULL,
	"bytes" integer NOT NULL,
	"largura" integer NOT NULL,
	"altura" integer NOT NULL,
	"repeticao_metros" double precision DEFAULT 2 NOT NULL,
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_texturas_dimensoes_check" CHECK ("members"."cenario_texturas"."largura" between 1 and 4096 and "members"."cenario_texturas"."altura" between 1 and 4096 and "members"."cenario_texturas"."largura"::bigint * "members"."cenario_texturas"."altura" <= 8388608),
	CONSTRAINT "cenario_texturas_repeticao_check" CHECK ("members"."cenario_texturas"."repeticao_metros" between 0.05 and 1000),
	CONSTRAINT "cenario_texturas_bytes_check" CHECK ("members"."cenario_texturas"."bytes" > 0 and "members"."cenario_texturas"."bytes" <= 4194304),
	CONSTRAINT "cenario_texturas_digest_check" CHECK ("members"."cenario_texturas"."digest" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" DROP CONSTRAINT "cenario_blobs_tipo_check";--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" DROP CONSTRAINT "cenario_blobs_conteudo_check";--> statement-breakpoint
ALTER TABLE "members"."cenario_texturas" ADD CONSTRAINT "cenario_texturas_biblioteca_id_cenario_bibliotecas_id_fk" FOREIGN KEY ("biblioteca_id") REFERENCES "members"."cenario_bibliotecas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_texturas_biblioteca_digest_uq" ON "members"."cenario_texturas" USING btree ("biblioteca_id","digest");--> statement-breakpoint
CREATE INDEX "cenario_texturas_lista_idx" ON "members"."cenario_texturas" USING btree ("biblioteca_id","nome","id");--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_tipo_check" CHECK ("members"."cenario_blobs"."tipo" in ('modelo', 'miniatura', 'capa', 'textura'));--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_conteudo_check" CHECK ("members"."cenario_blobs"."tipo_do_conteudo" is null or ("members"."cenario_blobs"."tipo" = 'modelo' and "members"."cenario_blobs"."tipo_do_conteudo" = 'model/gltf-binary') or ("members"."cenario_blobs"."tipo" in ('miniatura', 'capa', 'textura') and "members"."cenario_blobs"."tipo_do_conteudo" in ('image/webp', 'image/png')));