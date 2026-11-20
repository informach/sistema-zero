CREATE TABLE "members"."cenario_revisoes" (
	"cenario_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"documento" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_revisoes_cenario_id_revisao_pk" PRIMARY KEY("cenario_id","revisao")
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_cenarios" ADD COLUMN "historico" jsonb DEFAULT '{"passado":[],"futuro":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."cenario_lotes" ADD COLUMN "inversos" jsonb;--> statement-breakpoint
ALTER TABLE "members"."cenario_revisoes" ADD CONSTRAINT "cenario_revisoes_cenario_id_cenario_cenarios_id_fk" FOREIGN KEY ("cenario_id") REFERENCES "members"."cenario_cenarios"("id") ON DELETE cascade ON UPDATE no action;