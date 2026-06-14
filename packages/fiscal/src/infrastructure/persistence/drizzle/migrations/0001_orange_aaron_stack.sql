-- pg_trgm: índices trigram p/ a busca livre `q` do admin (ILIKE '%…%'). Espelha payments.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_substitute_active_uq" ON "fiscal"."invoices" USING btree ("substitutes_id") WHERE substitutes_id IS NOT NULL AND status NOT IN ('SUBSTITUTED', 'SKIPPED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE INDEX "invoices_customer_name_trgm_idx" ON "fiscal"."invoices" USING gin (("customer" ->> 'name') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "invoices_customer_email_trgm_idx" ON "fiscal"."invoices" USING gin (("customer" ->> 'email') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "invoices_customer_document_trgm_idx" ON "fiscal"."invoices" USING gin (("customer" ->> 'document') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "invoices_payment_id_text_trgm_idx" ON "fiscal"."invoices" USING gin (("payment_id"::text) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "invoices_access_key_trgm_idx" ON "fiscal"."invoices" USING gin ("access_key" gin_trgm_ops);