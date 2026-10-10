-- "Envio em dia" (10/10/2026): a impressão digital do CONTEÚDO (`v1:<sha256>`, calculada no
-- navegador pela régua do core) do rascunho guardado na conta e do envio à equipe. Texto opaco,
-- nulo em tudo o que já existe: sem as duas impressões o critério deixa passar.
ALTER TABLE "members"."creations" ADD COLUMN IF NOT EXISTS "content_fingerprint" varchar(70);--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN IF NOT EXISTS "pending_content_fingerprint" varchar(70);--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN IF NOT EXISTS "content_fingerprint" varchar(70);
