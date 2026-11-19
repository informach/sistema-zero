ALTER TABLE "members"."cenario_conjunto_usos" DROP CONSTRAINT "cenario_conjunto_usos_conjunto_id_cenario_conjuntos_id_fk";
--> statement-breakpoint
ALTER TABLE "members"."cenario_conjunto_versoes" ADD COLUMN "operacao_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."cenario_conjuntos" ADD COLUMN "operacao_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."cenario_conjunto_usos" ADD CONSTRAINT "cenario_conjunto_usos_versao_fk" FOREIGN KEY ("conjunto_id","revisao") REFERENCES "members"."cenario_conjunto_versoes"("conjunto_id","revisao") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_conjunto_versoes_operacao_uq" ON "members"."cenario_conjunto_versoes" USING btree ("conjunto_id","operacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cenario_conjuntos_operacao_uq" ON "members"."cenario_conjuntos" USING btree ("biblioteca_id","operacao_id");