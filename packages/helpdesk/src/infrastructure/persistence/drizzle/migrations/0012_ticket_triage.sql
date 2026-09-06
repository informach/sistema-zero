-- Triagem de e-mail (06/09/2026): o que NAO e atendimento nao abre ticket na fila.
-- `triage` = 'human' e atendimento; auto_reply/bounce/bulk/system/internal nascem
-- `closed` e triados (reversivel pela equipe: `triage_rule` 'manual:*').
-- `settings.triage_rules` guarda remetentes ignorados + dominios internos.
-- Aditiva, uma transacao: CREATE TYPE + ADD COLUMN com default (nao e ADD VALUE,
-- entao pode ser escrita na mesma transacao). Backfill dos tickets existentes e
-- pelo script `bun run triage:backfill` (dry-run por padrao), nao por SQL aqui.
CREATE TYPE "helpdesk"."triage_kind" AS ENUM('human', 'auto_reply', 'bounce', 'bulk', 'system', 'internal');--> statement-breakpoint
ALTER TABLE "helpdesk"."settings" ADD COLUMN "triage_rules" jsonb DEFAULT '{"ignoredSenders":[],"internalDomains":["sistemazero.com.br"]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "triage" "helpdesk"."triage_kind" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD COLUMN "triage_rule" text;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "triage" "helpdesk"."triage_kind" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "triage_rule" text;--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" ADD COLUMN "triaged_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tickets_triage_idx" ON "helpdesk"."tickets" USING btree ("triage") WHERE "helpdesk"."tickets"."triage" <> 'human';