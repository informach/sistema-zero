-- App que abriu o chamado pelo portal (adult = community, kids = community-kids):
-- decide o link do aviso de resposta. Nulo em ticket de e-mail e no legado.
-- CREATE TYPE + ADD COLUMN (não é ADD VALUE): pode ser ESCRITO na mesma transação.
CREATE TYPE "helpdesk"."ticket_portal" AS ENUM('adult', 'kids');--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "portal" "helpdesk"."ticket_portal";
