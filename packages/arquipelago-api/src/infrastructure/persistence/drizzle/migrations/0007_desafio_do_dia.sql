CREATE TABLE "arquipelago"."desafio_do_dia" (
	"jogador_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"desafio_id" uuid NOT NULL,
	"escolhido_em" timestamp with time zone NOT NULL,
	"feito_em" timestamp with time zone,
	CONSTRAINT "desafio_do_dia_jogador_id_dia_pk" PRIMARY KEY("jogador_id","dia")
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."desafio_do_dia" ADD CONSTRAINT "desafio_do_dia_desafio_id_desafios_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "arquipelago"."desafios"("id") ON DELETE cascade ON UPDATE no action;