CREATE TYPE "public"."idempotency_state" AS ENUM('IN_FLIGHT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'BOLETO', 'CREDIT_CARD');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "consumers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hmac_secret" text NOT NULL,
	"allowed_cidrs" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"state" "idempotency_state" NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"consumer_id" text NOT NULL,
	"status" "payment_status" NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_in_cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"txid" text,
	"idempotency_key" text NOT NULL,
	"card" jsonb,
	"pix_qr_code" jsonb,
	"customer" jsonb,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "idempotency_expires_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "outbox_status_created_idx" ON "outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_consumer_idem_uq" ON "payments" USING btree ("consumer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_txid_idx" ON "payments" USING btree ("txid");--> statement-breakpoint
CREATE INDEX "payments_provider_payment_idx" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_provider_event_uq" ON "webhook_events" USING btree ("provider","provider_event_id");