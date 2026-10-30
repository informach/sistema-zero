CREATE TABLE "arquipelago"."convites_adultos" (
	"jogador_id" uuid PRIMARY KEY NOT NULL,
	"hash" varchar(64) NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "convites_adultos_hash_unique" UNIQUE("hash"),
	CONSTRAINT "convites_adultos_hash_check" CHECK ("arquipelago"."convites_adultos"."hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."convites_adultos" ADD CONSTRAINT "convites_adultos_jogador_id_salvamentos_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;