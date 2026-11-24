CREATE TABLE "arquipelago"."cenario_catalogos" (
	"id" varchar(120) NOT NULL,
	"digest" varchar(64) NOT NULL,
	"modelos" jsonb NOT NULL,
	"autor_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_catalogos_id_digest_pk" PRIMARY KEY("id","digest")
);
--> statement-breakpoint
CREATE INDEX "cenario_catalogos_criado_idx" ON "arquipelago"."cenario_catalogos" USING btree ("criado_em");