CREATE TABLE "members"."cenario_retratos" (
	"cenario_id" uuid NOT NULL,
	"revisao" integer NOT NULL,
	"espaco_id" uuid NOT NULL,
	"digest" varchar(64) NOT NULL,
	"autor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cenario_retratos_cenario_id_revisao_pk" PRIMARY KEY("cenario_id","revisao"),
	CONSTRAINT "cenario_retratos_revisao_check" CHECK ("members"."cenario_retratos"."revisao" >= 0)
);
--> statement-breakpoint
ALTER TABLE "members"."cenario_retratos" ADD CONSTRAINT "cenario_retratos_cenario_id_cenario_cenarios_id_fk" FOREIGN KEY ("cenario_id") REFERENCES "members"."cenario_cenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."cenario_retratos" ADD CONSTRAINT "cenario_retratos_blob_fk" FOREIGN KEY ("espaco_id","digest") REFERENCES "members"."cenario_blobs"("espaco_id","digest") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cenario_retratos_blob_idx" ON "members"."cenario_retratos" USING btree ("espaco_id","digest");