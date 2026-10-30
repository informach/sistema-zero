CREATE TABLE "arquipelago"."mudancas_de_aparencia" (
	"jogador_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"objeto" varchar(40) NOT NULL,
	"publico" varchar(8) NOT NULL,
	"origem" varchar(10) NOT NULL,
	"registrado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "mudancas_de_aparencia_jogador_id_revisao_objeto_pk" PRIMARY KEY("jogador_id","revisao","objeto"),
	CONSTRAINT "mudancas_aparencia_publico_check" CHECK ("arquipelago"."mudancas_de_aparencia"."publico" in ('kids', 'adulto')),
	CONSTRAINT "mudancas_aparencia_origem_check" CHECK ("arquipelago"."mudancas_de_aparencia"."origem" in ('pinta', 'molda', 'criacao', 'galeria')),
	CONSTRAINT "mudancas_aparencia_revisao_check" CHECK ("arquipelago"."mudancas_de_aparencia"."revisao" >= 2)
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."mudancas_de_aparencia" ADD CONSTRAINT "mudancas_de_aparencia_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mudancas_aparencia_periodo_idx" ON "arquipelago"."mudancas_de_aparencia" USING btree ("publico","registrado_em");