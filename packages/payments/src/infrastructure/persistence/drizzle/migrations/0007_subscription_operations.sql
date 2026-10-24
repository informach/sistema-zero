CREATE TYPE "payments"."subscription_operation_kind" AS ENUM('CARD_UPDATE', 'RETRY', 'CANCEL');--> statement-breakpoint
CREATE TYPE "payments"."subscription_operation_state" AS ENUM('READY', 'EXECUTING', 'UNKNOWN', 'SUCCEEDED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "payments"."subscription_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"consumer_id" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"kind" "payments"."subscription_operation_kind" NOT NULL,
	"state" "payments"."subscription_operation_state" NOT NULL,
	"provider_payment_id" text,
	"amount_in_cents" bigint,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"result" text,
	CONSTRAINT "subscription_operations_amount_check" CHECK ((
      ("payments"."subscription_operations"."kind" = 'RETRY' and "payments"."subscription_operations"."provider_payment_id" is not null and "payments"."subscription_operations"."amount_in_cents" is not null and "payments"."subscription_operations"."amount_in_cents" > 0)
    or ("payments"."subscription_operations"."kind" <> 'RETRY' and "payments"."subscription_operations"."provider_payment_id" is null and "payments"."subscription_operations"."amount_in_cents" is null)
  )),
	CONSTRAINT "subscription_operations_currency_check" CHECK ("payments"."subscription_operations"."currency" = 'BRL'),
	CONSTRAINT "subscription_operations_deadline_check" CHECK ("payments"."subscription_operations"."expires_at" > "payments"."subscription_operations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_operations" ADD CONSTRAINT "subscription_operations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "payments"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_operations_active_uq" ON "payments"."subscription_operations" USING btree ("subscription_id") WHERE "payments"."subscription_operations"."state" in ('READY', 'EXECUTING', 'UNKNOWN');--> statement-breakpoint
CREATE INDEX "subscription_operations_subscription_idx" ON "payments"."subscription_operations" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_operations_pending_idx" ON "payments"."subscription_operations" USING btree ("state","started_at");