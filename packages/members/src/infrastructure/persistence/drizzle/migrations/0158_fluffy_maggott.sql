CREATE TABLE "members"."cenario_conjunto_usos" (
	"cenario_id" uuid NOT NULL,
	"montagem_id" varchar(160) NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	CONSTRAINT "cenario_conjunto_usos_cenario_id_montagem_id_pk" PRIMARY KEY("cenario_id","montagem_id"),
	CONSTRAINT "cenario_conjunto_usos_revisao_check" CHECK ("members"."cenario_conjunto_usos"."revisao" > 0)
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_conjunto_versoes" (
	"conjunto_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"nome" varchar(120) NOT NULL,
	"conteudo" jsonb NOT NULL,
	"miniatura" varchar(64),
	"bytes" integer NOT NULL,
	"objetos" integer NOT NULL,
	"autor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_conjunto_versoes_conjunto_id_revisao_pk" PRIMARY KEY("conjunto_id","revisao"),
	CONSTRAINT "cenario_conjunto_versoes_revisao_check" CHECK ("members"."cenario_conjunto_versoes"."revisao" > 0),
	CONSTRAINT "cenario_conjunto_versoes_bytes_check" CHECK ("members"."cenario_conjunto_versoes"."bytes" between 1 and 8388608),
	CONSTRAINT "cenario_conjunto_versoes_objetos_check" CHECK ("members"."cenario_conjunto_versoes"."objetos" between 1 and 2000),
	CONSTRAINT "cenario_conjunto_versoes_miniatura_check" CHECK ("members"."cenario_conjunto_versoes"."miniatura" is null or "members"."cenario_conjunto_versoes"."miniatura" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "members"."cenario_conjuntos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"biblioteca_id" uuid NOT NULL,
	"nome" varchar(120) NOT NULL,
	"pasta" varchar(240) DEFAULT '' NOT NULL,
	"etiquetas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"busca" varchar(600) NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"criado_por" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_conjuntos_revisao_check" CHECK ("members"."cenario_conjuntos"."revisao" > 0)
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_conjunto_usos" ADD CONSTRAINT "cenario_conjunto_usos_cenario_id_cenario_cenarios_id_fk" FOREIGN KEY ("cenario_id") REFERENCES "members"."cenario_cenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_conjunto_usos" ADD CONSTRAINT "cenario_conjunto_usos_conjunto_id_cenario_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "members"."cenario_conjuntos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_conjunto_versoes" ADD CONSTRAINT "cenario_conjunto_versoes_conjunto_id_cenario_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "members"."cenario_conjuntos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_conjuntos" ADD CONSTRAINT "cenario_conjuntos_biblioteca_id_cenario_bibliotecas_id_fk" FOREIGN KEY ("biblioteca_id") REFERENCES "members"."cenario_bibliotecas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_conjunto_usos_conjunto_idx" ON "members"."cenario_conjunto_usos" USING btree ("conjunto_id","cenario_id");--> statement-breakpoint
CREATE INDEX "cenario_conjuntos_lista_idx" ON "members"."cenario_conjuntos" USING btree ("biblioteca_id","busca","id");