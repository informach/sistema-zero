CREATE TABLE "arquipelago"."casas_de_amigos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conta_visitante" uuid NOT NULL,
	"perfil_anfitriao" uuid NOT NULL,
	"apelido" varchar(24) NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "casas_de_amigos_apelido_check" CHECK (char_length("arquipelago"."casas_de_amigos"."apelido") between 1 and 24)
);
--> statement-breakpoint
CREATE TABLE "arquipelago"."convites_de_amigos" (
	"perfil_id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"hash" varchar(64) NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "convites_de_amigos_hash_unique" UNIQUE("hash"),
	CONSTRAINT "convites_de_amigos_hash_check" CHECK ("arquipelago"."convites_de_amigos"."hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "arquipelago"."casas_de_amigos" ADD CONSTRAINT "casas_de_amigos_perfil_anfitriao_salvamentos_jogador_id_fk" FOREIGN KEY ("perfil_anfitriao") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquipelago"."convites_de_amigos" ADD CONSTRAINT "convites_de_amigos_perfil_id_salvamentos_jogador_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "arquipelago"."salvamentos"("jogador_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "casas_de_amigos_par" ON "arquipelago"."casas_de_amigos" USING btree ("conta_visitante","perfil_anfitriao");