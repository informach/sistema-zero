ALTER TABLE "payments" ADD COLUMN "charge_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "charge_claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "payments_pending_charge_idx" ON "payments" USING btree ("created_at") WHERE provider_payment_id IS NULL AND status = 'PENDING';