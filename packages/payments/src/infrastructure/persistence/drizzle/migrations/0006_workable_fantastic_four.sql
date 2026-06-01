CREATE TYPE "public"."subscription_status" AS ENUM('PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "subscription_plans" (
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
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"consumer_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
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
ALTER TABLE "payments" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_key_uq" ON "subscription_plans" USING btree ("provider","interval_months","repeats_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_consumer_idem_uq" ON "subscriptions" USING btree ("consumer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_sub_idx" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments" USING btree ("subscription_id");