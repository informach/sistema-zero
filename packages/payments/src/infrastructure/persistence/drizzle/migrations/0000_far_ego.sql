CREATE SCHEMA "payments";
--> statement-breakpoint
CREATE TYPE "payments"."delivery_status" AS ENUM('PENDING', 'SUCCEEDED', 'DEAD');--> statement-breakpoint
CREATE TYPE "payments"."idempotency_state" AS ENUM('IN_FLIGHT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "payments"."outbox_status" AS ENUM('PENDING', 'PUBLISHED', 'DEAD');--> statement-breakpoint
CREATE TYPE "payments"."payment_method" AS ENUM('PIX', 'BOLETO', 'CREDIT_CARD');--> statement-breakpoint
CREATE TYPE "payments"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "payments"."subscription_status" AS ENUM('PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "payments"."consumers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hmac_secret" text NOT NULL,
	"allowed_cidrs" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."idempotency_keys" (
	"consumer_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"reservation_id" text,
	"state" "payments"."idempotency_state" NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_consumer_id_key_pk" PRIMARY KEY("consumer_id","key")
);
--> statement-breakpoint
CREATE TABLE "payments"."outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "payments"."outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"consumer_id" text NOT NULL,
	"status" "payments"."payment_status" NOT NULL,
	"method" "payments"."payment_method" NOT NULL,
	"amount_in_cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"txid" text,
	"idempotency_key" text NOT NULL,
	"card" jsonb,
	"pix_qr_code" jsonb,
	"boleto" jsonb,
	"boleto_request" jsonb,
	"customer" jsonb,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reason" text,
	"subscription_id" uuid,
	"charge_attempts" integer DEFAULT 0 NOT NULL,
	"charge_claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments"."subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"interval_months" integer NOT NULL,
	"repeats" integer,
	"repeats_key" integer NOT NULL,
	"provider_plan_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"consumer_id" text NOT NULL,
	"status" "payments"."subscription_status" NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text,
	"provider_plan_id" text NOT NULL,
	"interval_months" integer NOT NULL,
	"repeats" integer,
	"amount_in_cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"card" jsonb NOT NULL,
	"customer" jsonb,
	"idempotency_key" text NOT NULL,
	"cycles_completed" integer DEFAULT 0 NOT NULL,
	"last_charge_id" text,
	"last_charge_at" timestamp with time zone,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_id" text NOT NULL,
	"event_name" text NOT NULL,
	"dedup_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "payments"."delivery_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_status_code" integer,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "idempotency_expires_idx" ON "payments"."idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "outbox_status_created_idx" ON "payments"."outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_consumer_idem_uq" ON "payments"."payments" USING btree ("consumer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments"."payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_txid_idx" ON "payments"."payments" USING btree ("txid");--> statement-breakpoint
CREATE INDEX "payments_provider_payment_idx" ON "payments"."payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_pending_charge_idx" ON "payments"."payments" USING btree ("created_at") WHERE provider_payment_id IS NULL AND status = 'PENDING';--> statement-breakpoint
CREATE INDEX "payments_reconcile_idx" ON "payments"."payments" USING btree ("updated_at") WHERE status = 'PENDING' AND provider_payment_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments"."payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_key_uq" ON "payments"."subscription_plans" USING btree ("provider","interval_months","repeats_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_consumer_idem_uq" ON "payments"."subscriptions" USING btree ("consumer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_sub_idx" ON "payments"."subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "payments"."subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "payments"."webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_dedup_uq" ON "payments"."webhook_deliveries" USING btree ("consumer_id","event_name","dedup_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_provider_event_uq" ON "payments"."webhook_events" USING btree ("provider","provider_event_id");