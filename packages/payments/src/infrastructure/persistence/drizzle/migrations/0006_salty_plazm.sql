ALTER TABLE "payments"."subscriptions" ADD COLUMN "last_reconciled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "subscriptions_reconcile_idx" ON "payments"."subscriptions" USING btree ("last_reconciled_at" NULLS FIRST,"last_charge_at" NULLS FIRST,"id") WHERE status = 'ACTIVE' AND provider_subscription_id IS NOT NULL;
