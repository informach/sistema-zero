-- Outbox dead-letter: novo estado terminal para mensagens "envenenadas".
ALTER TYPE "public"."outbox_status" ADD VALUE IF NOT EXISTS 'DEAD';--> statement-breakpoint

-- payments: coluna de versão para concorrência otimista (default 0 → seguro em tabela populada).
ALTER TABLE "payments" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- idempotency_keys: passa a ser escopada por consumidor (PK composta).
-- Ordem importa: adiciona a coluna, preenche, torna NOT NULL, troca a PK.
ALTER TABLE "idempotency_keys" ADD COLUMN "consumer_id" text;--> statement-breakpoint
UPDATE "idempotency_keys" SET "consumer_id" = '' WHERE "consumer_id" IS NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "consumer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_pkey";--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_consumer_id_key_pk" PRIMARY KEY("consumer_id","key");--> statement-breakpoint

-- webhook_deliveries: chave de dedupe para enqueue idempotente.
ALTER TABLE "webhook_deliveries" ADD COLUMN "dedup_key" text;--> statement-breakpoint
UPDATE "webhook_deliveries" SET "dedup_key" = "id"::text WHERE "dedup_key" IS NULL;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "dedup_key" SET NOT NULL;--> statement-breakpoint

-- Índices novos.
CREATE INDEX "payments_reconcile_idx" ON "payments" USING btree ("updated_at") WHERE status = 'PENDING' AND provider_payment_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_dedup_uq" ON "webhook_deliveries" USING btree ("consumer_id","event_name","dedup_key");
