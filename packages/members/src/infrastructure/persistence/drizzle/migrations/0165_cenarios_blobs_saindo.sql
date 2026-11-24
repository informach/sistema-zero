CREATE TABLE "members"."cenario_blobs_saindo" (
	"espaco_id" uuid NOT NULL,
	"digest" varchar(64) NOT NULL,
	"desde" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_blobs_saindo_espaco_id_digest_pk" PRIMARY KEY("espaco_id","digest")
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs_saindo" ADD CONSTRAINT "cenario_blobs_saindo_espaco_id_cenario_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "members"."cenario_espacos"("id") ON DELETE cascade ON UPDATE no action;