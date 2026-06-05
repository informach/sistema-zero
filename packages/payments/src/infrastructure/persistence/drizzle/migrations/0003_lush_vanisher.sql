-- pg_trgm: índices trigram (busca livre `q` do admin com ILIKE '%…%').
-- Contrib padrão do Postgres (disponível no Railway). Instala no schema public.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments"."payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments"."payments" USING btree ("paid_at") WHERE paid_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_txid_trgm_idx" ON "payments"."payments" USING gin ("txid" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "payments_provider_payment_trgm_idx" ON "payments"."payments" USING gin ("provider_payment_id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "payments_id_text_trgm_idx" ON "payments"."payments" USING gin (("id"::text) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "payments_customer_email_trgm_idx" ON "payments"."payments" USING gin (("customer" ->> 'email') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subscriptions_created_at_idx" ON "payments"."subscriptions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_sub_trgm_idx" ON "payments"."subscriptions" USING gin ("provider_subscription_id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subscriptions_id_text_trgm_idx" ON "payments"."subscriptions" USING gin (("id"::text) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subscriptions_customer_email_trgm_idx" ON "payments"."subscriptions" USING gin (("customer" ->> 'email') gin_trgm_ops);