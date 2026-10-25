CREATE TABLE "payments"."subscription_paid_cycles" (
	"subscription_id" uuid NOT NULL,
	"provider_payment_id" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_paid_cycles_subscription_id_provider_payment_id_pk" PRIMARY KEY("subscription_id","provider_payment_id"),
	CONSTRAINT "subscription_paid_cycle_charge_check" CHECK (length("payments"."subscription_paid_cycles"."provider_payment_id") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_paid_cycles" ADD CONSTRAINT "subscription_paid_cycles_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "payments"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;